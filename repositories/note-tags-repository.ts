import type { NoteTagLink } from '@/types';
import { db } from '@/repositories/db';

export const noteTagsRepository = {
  async listForNote(noteLocalId: number): Promise<NoteTagLink[]> {
    return db.noteTags.where('noteLocalId').equals(noteLocalId).toArray();
  },

  async listTagIdsForNote(noteLocalId: number): Promise<number[]> {
    const rows = await this.listForNote(noteLocalId);
    return rows.map((r) => r.tagId);
  },

  async replaceForNote(noteLocalId: number, tagIds: number[]): Promise<void> {
    const unique = [...new Set(tagIds.filter((id) => Number.isFinite(id)))];
    await db.transaction('rw', db.noteTags, db.notes, async () => {
      await db.noteTags.where('noteLocalId').equals(noteLocalId).delete();
      const now = Date.now();
      if (unique.length > 0) {
        await db.noteTags.bulkAdd(
          unique.map((tagId) => ({
            noteLocalId,
            tagId,
            createdAt: now,
          })),
        );
      }
      await db.notes.update(noteLocalId, { tags: unique });
    });
  },

  async removeForNote(noteLocalId: number): Promise<void> {
    await db.noteTags.where('noteLocalId').equals(noteLocalId).delete();
  },

  async removeForTag(tagId: number): Promise<void> {
    const links = await db.noteTags.where('tagId').equals(tagId).toArray();
    await db.transaction('rw', db.noteTags, db.notes, async () => {
      await db.noteTags.where('tagId').equals(tagId).delete();
      for (const link of links) {
        const note = await db.notes.get(link.noteLocalId);
        if (!note?.localId) continue;
        const tags = note.tags.filter((id) => id !== tagId);
        await db.notes.update(note.localId, { tags });
      }
    });
  },
};
