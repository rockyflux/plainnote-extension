import type { DraftRecord, NoteFormat } from '@/types';
import { draftsRepository } from '@/repositories/drafts-repository';
import { ensureDatabaseSeeded } from '@/repositories/db';
import { DEFAULT_SERVICE_ID } from '@/utils/constants';

export interface PopupDraftInput {
  serviceId: string;
  title: string;
  content: string;
  format: NoteFormat;
  folderId: number | null;
  tagIds: number[];
}

export interface EditorDraftInput {
  noteLocalId: number;
  serviceId: string;
  title: string;
  content: string;
  format: NoteFormat;
}

export const draftsService = {
  async list(): Promise<DraftRecord[]> {
    await ensureDatabaseSeeded();
    return draftsRepository.list();
  },

  async saveNew(input: {
    serviceId: string;
    title?: string;
    content: string;
    format: NoteFormat;
    folderId?: number | null;
    tagIds?: number[];
  }): Promise<number> {
    await ensureDatabaseSeeded();
    return draftsRepository.create(input);
  },

  async getPopupDraft(): Promise<DraftRecord | null> {
    await ensureDatabaseSeeded();
    return (await draftsRepository.findPopupDraft()) ?? null;
  },

  /** Autosave Popup form into a single dedicated draft row. */
  async savePopupDraft(input: PopupDraftInput): Promise<number> {
    await ensureDatabaseSeeded();
    const existing = await draftsRepository.findPopupDraft();
    if (existing?.id != null) {
      await draftsRepository.update(existing.id, {
        serviceId: input.serviceId || DEFAULT_SERVICE_ID,
        title: input.title,
        content: input.content,
        format: input.format,
        folderId: input.folderId,
        tagIds: input.tagIds,
        kind: 'popup',
      });
      return existing.id;
    }
    return draftsRepository.create({
      ...input,
      serviceId: input.serviceId || DEFAULT_SERVICE_ID,
      kind: 'popup',
    });
  },

  async clearPopupDraft(): Promise<void> {
    await ensureDatabaseSeeded();
    await draftsRepository.removePopupDrafts();
  },

  async getEditorDraft(noteLocalId: number): Promise<DraftRecord | null> {
    await ensureDatabaseSeeded();
    return (await draftsRepository.findEditorDraft(noteLocalId)) ?? null;
  },

  /**
   * Autosave editor working copy locally.
   * This does NOT call the PlainNote API and must not be treated as remote sync.
   */
  async saveEditorDraft(input: EditorDraftInput): Promise<number> {
    await ensureDatabaseSeeded();
    const existing = await draftsRepository.findEditorDraft(input.noteLocalId);
    if (existing?.id != null) {
      await draftsRepository.update(existing.id, {
        serviceId: input.serviceId || DEFAULT_SERVICE_ID,
        title: input.title,
        content: input.content,
        format: input.format,
        kind: 'editor',
        noteLocalId: input.noteLocalId,
      });
      return existing.id;
    }
    return draftsRepository.create({
      serviceId: input.serviceId || DEFAULT_SERVICE_ID,
      title: input.title,
      content: input.content,
      format: input.format,
      kind: 'editor',
      noteLocalId: input.noteLocalId,
    });
  },

  async clearEditorDraft(noteLocalId: number): Promise<void> {
    await ensureDatabaseSeeded();
    await draftsRepository.removeEditorDraft(noteLocalId);
  },

  async remove(id: number): Promise<void> {
    await draftsRepository.remove(id);
  },
};
