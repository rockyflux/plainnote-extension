import Dexie, { type EntityTable } from 'dexie';
import type {
  DraftRecord,
  LocalFolder,
  LocalNote,
  LocalTag,
  NoteTagLink,
  ServiceRecord,
  SettingsRow,
  ShareRecord,
} from '@/types';
import {
  DEFAULT_SERVER_BASE_URL,
  DEFAULT_SERVICE_ID,
  DEFAULT_SERVICE_NAME,
} from '@/utils/constants';

export class PlainNoteDatabase extends Dexie {
  notes!: EntityTable<LocalNote, 'localId'>;
  folders!: EntityTable<LocalFolder, 'id'>;
  tags!: EntityTable<LocalTag, 'id'>;
  noteTags!: EntityTable<NoteTagLink, 'id'>;
  shareRecords!: EntityTable<ShareRecord, 'id'>;
  services!: EntityTable<ServiceRecord, 'id'>;
  drafts!: EntityTable<DraftRecord, 'id'>;
  settings!: EntityTable<SettingsRow, 'key'>;

  constructor() {
    super('plainnote-extension');

    // v1 — early scaffold (may exist on developer machines)
    this.version(1).stores({
      notes: '++localId, secret, publicId, serverBaseUrl, folderId, favorite, updatedAt',
      folders: '++id, name, updatedAt',
      tags: '++id, name, updatedAt',
      shareHistory: '++id, secret, sharedAt, serverBaseUrl',
    });

    // v2 — full local data layer + multi-service
    this.version(2)
      .stores({
        notes:
          '++localId, serverId, secret, serviceId, folderId, favorite, syncStatus, updatedAt, lastOpenedAt',
        folders: '++id, name, updatedAt',
        tags: '++id, name, updatedAt',
        noteTags: '++id, noteLocalId, tagId, [noteLocalId+tagId]',
        shareRecords: '++id, noteLocalId, serviceId, serverId, sharedAt, channel',
        services: 'id, baseUrl, isDefault, updatedAt',
        drafts: '++id, serviceId, updatedAt',
        settings: 'key, updatedAt',
        shareHistory: null,
      })
      .upgrade(async (tx) => {
        // Drop insecure legacy share history that stored secrets.
        try {
          await tx.table('shareHistory').clear();
        } catch {
          // table may already be gone
        }

        const services = tx.table('services');
        const existingDefault = await services.get(DEFAULT_SERVICE_ID);
        if (!existingDefault) {
          const now = Date.now();
          await services.put({
            id: DEFAULT_SERVICE_ID,
            name: DEFAULT_SERVICE_NAME,
            baseUrl: DEFAULT_SERVER_BASE_URL,
            isDefault: true,
            createdAt: now,
            updatedAt: now,
            lastCheckedAt: null,
            lastStatus: 'unknown',
            lastError: null,
            lastLatencyMs: null,
          } satisfies ServiceRecord);
        }

        // Best-effort migrate legacy note rows if any.
        const notesTable = tx.table('notes');
        const legacyNotes = await notesTable.toArray();
        for (const row of legacyNotes) {
          const anyRow = row as Record<string, unknown>;
          if (anyRow.serviceId && anyRow.serverId) continue;

          const serverId =
            (anyRow.serverId as string | undefined) ||
            (anyRow.publicId as string | undefined) ||
            '';
          const serviceId =
            (anyRow.serviceId as string | undefined) || DEFAULT_SERVICE_ID;
          const tags =
            (anyRow.tags as number[] | undefined) ||
            (anyRow.tagIds as number[] | undefined) ||
            [];

          await notesTable.put({
            ...anyRow,
            serverId,
            serviceId,
            content: (anyRow.content as string | undefined) ?? '',
            tags,
            lastOpenedAt: (anyRow.lastOpenedAt as number | null | undefined) ?? null,
            syncStatus: (anyRow.syncStatus as string | undefined) ?? 'synced',
          });
        }
      });
  }
}

export const db = new PlainNoteDatabase();

let seedPromise: Promise<void> | null = null;

async function seedOfficialService(): Promise<void> {
  const existing = await db.services.get(DEFAULT_SERVICE_ID);
  if (existing) {
    if (!existing.isDefault) {
      const defaults = await db.services.filter((s) => s.isDefault).toArray();
      if (defaults.length === 0) {
        await db.services.update(DEFAULT_SERVICE_ID, { isDefault: true });
      }
    }
    return;
  }

  const now = Date.now();
  await db.services.put({
    id: DEFAULT_SERVICE_ID,
    name: DEFAULT_SERVICE_NAME,
    baseUrl: DEFAULT_SERVER_BASE_URL,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
    lastCheckedAt: null,
    lastStatus: 'unknown',
    lastError: null,
    lastLatencyMs: null,
  });
}

/** Ensure official default service exists (idempotent; re-checks after wipe). */
export function ensureDatabaseSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedOfficialService();
  }
  return seedPromise.then(async () => {
    const existing = await db.services.get(DEFAULT_SERVICE_ID);
    if (!existing) {
      seedPromise = seedOfficialService();
      await seedPromise;
    }
  });
}
