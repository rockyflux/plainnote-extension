import type {
  CreateNotePayload,
  LocalNote,
  NoteFull,
  NotePublic,
  UpdateNotePayload,
} from '@/types';
import { plainNoteApi, type PlainNoteApi } from '@/services/api-client';
import { notesRepository } from '@/repositories/notes-repository';
import { noteTagsRepository } from '@/repositories/note-tags-repository';
import { servicesRepository } from '@/repositories/services-repository';
import { ensureDatabaseSeeded } from '@/repositories/db';
import { MAX_CONTENT_LENGTH, MAX_TITLE_LENGTH } from '@/utils/constants';
import { ensureHostPermission } from '@/utils/host-permissions';

export interface CreateLocalOptions {
  folderId?: number | null;
  tagIds?: number[];
  favorite?: boolean;
}

export interface NoteServiceDeps {
  api?: PlainNoteApi;
  resolveBaseUrl?: (serviceId: string) => Promise<string>;
  notesRepo?: typeof notesRepository;
  noteTagsRepo?: typeof noteTagsRepository;
}

function assertFormat(format: string): asserts format is 'text' | 'markdown' {
  if (format !== 'text' && format !== 'markdown') {
    throw new Error('INVALID_FORMAT');
  }
}

function validateCreatePayload(payload: CreateNotePayload): void {
  assertFormat(payload.format);
  if (typeof payload.content !== 'string' || payload.content.trim().length === 0) {
    throw new Error('CONTENT_REQUIRED');
  }
  if ([...payload.content].length > MAX_CONTENT_LENGTH) {
    throw new Error('CONTENT_TOO_LONG');
  }
  if (payload.title != null && typeof payload.title === 'string') {
    if ([...payload.title.trim()].length > MAX_TITLE_LENGTH) {
      throw new Error('TITLE_TOO_LONG');
    }
  }
}

/** Prefer server-returned URLs; never invent public/private links client-side. */
function toLocalNote(
  note: NoteFull,
  serviceId: string,
  existing?: LocalNote,
  localOpts?: CreateLocalOptions,
): LocalNote {
  return {
    localId: existing?.localId,
    serverId: note.id,
    secret: note.secret,
    serviceId: existing?.serviceId ?? serviceId,
    title: note.title,
    content: note.content,
    format: note.format,
    editUrl: note.editUrl,
    noteUrl: note.noteUrl,
    rawUrl: note.rawUrl,
    folderId: localOpts?.folderId !== undefined ? localOpts.folderId : (existing?.folderId ?? null),
    tags: localOpts?.tagIds ?? existing?.tags ?? [],
    favorite: localOpts?.favorite ?? existing?.favorite ?? false,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    lastOpenedAt: existing?.lastOpenedAt ?? null,
    syncStatus: 'synced',
  };
}

async function defaultResolveBaseUrl(serviceId: string): Promise<string> {
  await ensureDatabaseSeeded();
  const service = await servicesRepository.get(serviceId);
  if (!service) throw new Error('SERVICE_NOT_FOUND');
  const granted = await ensureHostPermission(service.baseUrl);
  if (!granted) throw new Error('HOST_PERMISSION_DENIED');
  return service.baseUrl;
}

function assertServiceMatch(note: LocalNote, serviceId: string): void {
  if (note.serviceId !== serviceId) {
    throw new Error('SERVICE_MISMATCH');
  }
}

export function createNoteService(deps: NoteServiceDeps = {}) {
  const api = deps.api ?? plainNoteApi;
  const resolveBaseUrl = deps.resolveBaseUrl ?? defaultResolveBaseUrl;
  const notesRepo = deps.notesRepo ?? notesRepository;
  const noteTagsRepo = deps.noteTagsRepo ?? noteTagsRepository;

  return {
    async create(
      serviceId: string,
      payload: CreateNotePayload,
      localOpts?: CreateLocalOptions,
    ): Promise<LocalNote> {
      validateCreatePayload(payload);
      const baseUrl = await resolveBaseUrl(serviceId);
      const created = await api.create(baseUrl, {
        title: payload.title ?? null,
        content: payload.content,
        format: payload.format,
        timezone: payload.timezone,
        language: payload.language,
      });
      const local = toLocalNote(created, serviceId, undefined, localOpts);
      const localId = await notesRepo.upsert(local);
      if (localOpts?.tagIds?.length) {
        await noteTagsRepo.replaceForNote(localId, localOpts.tagIds);
      }
      return { ...local, localId, tags: localOpts?.tagIds ?? [] };
    },

    async loadBySecret(serviceId: string, secret: string): Promise<LocalNote> {
      const existing = await notesRepo.findBySecret(secret, serviceId);
      if (existing) assertServiceMatch(existing, serviceId);

      const baseUrl = await resolveBaseUrl(serviceId);
      const remote = await api.getBySecret(baseUrl, secret);
      const local = toLocalNote(remote, serviceId, existing ?? undefined);
      const localId = await notesRepo.upsert(local);
      await notesRepo.touchOpened(localId);
      return { ...local, localId };
    },

    async getPublic(serviceId: string, id: string): Promise<NotePublic> {
      const baseUrl = await resolveBaseUrl(serviceId);
      return api.getPublic(baseUrl, id);
    },

    async getRaw(serviceId: string, id: string): Promise<string> {
      const baseUrl = await resolveBaseUrl(serviceId);
      return api.getRaw(baseUrl, id);
    },

    async update(
      serviceId: string,
      secret: string,
      payload: UpdateNotePayload,
    ): Promise<LocalNote> {
      const existing = await notesRepo.findBySecret(secret, serviceId);
      if (!existing) throw new Error('NOTE_NOT_LOCAL');
      assertServiceMatch(existing, serviceId);

      if (payload.format !== undefined) assertFormat(payload.format);
      if (payload.content !== undefined) {
        if (typeof payload.content !== 'string' || payload.content.trim().length === 0) {
          throw new Error('CONTENT_REQUIRED');
        }
        if ([...payload.content].length > MAX_CONTENT_LENGTH) {
          throw new Error('CONTENT_TOO_LONG');
        }
      }

      const baseUrl = await resolveBaseUrl(existing.serviceId);
      const updated = await api.update(baseUrl, secret, payload);
      const local = toLocalNote(updated, existing.serviceId, existing);
      const localId = await notesRepo.upsert(local);
      return { ...local, localId };
    },

    async updateByLocalId(localId: number, payload: UpdateNotePayload): Promise<LocalNote> {
      const existing = await notesRepo.getByLocalId(localId);
      if (!existing) throw new Error('NOTE_NOT_LOCAL');
      return this.update(existing.serviceId, existing.secret, payload);
    },

    async removeRemoteAndLocal(serviceId: string, secret: string): Promise<void> {
      const existing = await notesRepo.findBySecret(secret, serviceId);
      if (existing) assertServiceMatch(existing, serviceId);

      const boundServiceId = existing?.serviceId ?? serviceId;
      const baseUrl = await resolveBaseUrl(boundServiceId);
      await api.remove(baseUrl, secret);

      if (existing?.localId != null) {
        await notesRepo.deleteLocalIndex(existing.localId);
      } else {
        await notesRepo.deleteBySecret(secret, boundServiceId);
      }
    },

    async removeRemoteAndLocalByLocalId(localId: number): Promise<void> {
      const existing = await notesRepo.getByLocalId(localId);
      if (!existing) throw new Error('NOTE_NOT_LOCAL');
      await this.removeRemoteAndLocal(existing.serviceId, existing.secret);
    },

    async removeLocalIndexOnly(localId: number): Promise<void> {
      await notesRepo.deleteLocalIndex(localId);
    },

    async refresh(serviceId: string, secret: string): Promise<LocalNote> {
      return this.loadBySecret(serviceId, secret);
    },

    async listLocal(): Promise<LocalNote[]> {
      await ensureDatabaseSeeded();
      return notesRepo.list();
    },
  };
}

export const noteService = createNoteService();
