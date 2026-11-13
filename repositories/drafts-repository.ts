import type { DraftRecord, NoteFormat } from '@/types';
import { db } from '@/repositories/db';

export const draftsRepository = {
  list(): Promise<DraftRecord[]> {
    return db.drafts.orderBy('updatedAt').reverse().toArray();
  },

  async get(id: number): Promise<DraftRecord | undefined> {
    return db.drafts.get(id);
  },

  async findPopupDraft(): Promise<DraftRecord | undefined> {
    const rows = await db.drafts.toArray();
    return rows
      .filter((d) => d.kind === 'popup')
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  },

  async findEditorDraft(noteLocalId: number): Promise<DraftRecord | undefined> {
    const rows = await db.drafts.toArray();
    return rows
      .filter((d) => d.kind === 'editor' && d.noteLocalId === noteLocalId)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  },

  async create(input: {
    serviceId: string;
    title?: string;
    content?: string;
    format?: NoteFormat;
    folderId?: number | null;
    tagIds?: number[];
    kind?: 'popup' | 'editor' | 'general';
    noteLocalId?: number | null;
  }): Promise<number> {
    const now = Date.now();
    return (await db.drafts.add({
      serviceId: input.serviceId,
      title: input.title ?? '',
      content: input.content ?? '',
      format: input.format ?? 'markdown',
      folderId: input.folderId ?? null,
      tagIds: input.tagIds ?? [],
      kind: input.kind ?? 'general',
      noteLocalId: input.noteLocalId ?? null,
      createdAt: now,
      updatedAt: now,
    })) as number;
  },

  async update(
    id: number,
    patch: Partial<
      Pick<
        DraftRecord,
        | 'serviceId'
        | 'title'
        | 'content'
        | 'format'
        | 'folderId'
        | 'tagIds'
        | 'kind'
        | 'noteLocalId'
      >
    >,
  ): Promise<void> {
    await db.drafts.update(id, { ...patch, updatedAt: Date.now() });
  },

  async remove(id: number): Promise<void> {
    await db.drafts.delete(id);
  },

  async removePopupDrafts(): Promise<void> {
    const rows = await db.drafts.toArray();
    const ids = rows.filter((d) => d.kind === 'popup' && d.id != null).map((d) => d.id!);
    if (ids.length) await db.drafts.bulkDelete(ids);
  },

  async removeEditorDraft(noteLocalId: number): Promise<void> {
    const rows = await db.drafts.toArray();
    const ids = rows
      .filter((d) => d.kind === 'editor' && d.noteLocalId === noteLocalId && d.id != null)
      .map((d) => d.id!);
    if (ids.length) await db.drafts.bulkDelete(ids);
  },
};
