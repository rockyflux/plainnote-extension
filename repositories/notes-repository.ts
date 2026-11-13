import type { LocalNote, SyncStatus } from '@/types';
import { db } from '@/repositories/db';
import { noteTagsRepository } from '@/repositories/note-tags-repository';

export type LocalNoteDeleteMode = 'index-only' | 'with-relations';

export const notesRepository = {
  async list(): Promise<LocalNote[]> {
    return db.notes.orderBy('updatedAt').reverse().toArray();
  },

  async listByService(serviceId: string): Promise<LocalNote[]> {
    const rows = await db.notes.where('serviceId').equals(serviceId).sortBy('updatedAt');
    return rows.reverse();
  },

  async getByLocalId(localId: number): Promise<LocalNote | undefined> {
    return db.notes.get(localId);
  },

  async findBySecret(secret: string, serviceId?: string): Promise<LocalNote | undefined> {
    if (serviceId) {
      const rows = await db.notes.where('secret').equals(secret).toArray();
      return rows.find((n) => n.serviceId === serviceId);
    }
    return db.notes.where('secret').equals(secret).first();
  },

  async findByServerId(serverId: string, serviceId: string): Promise<LocalNote | undefined> {
    const rows = await db.notes.where('serverId').equals(serverId).toArray();
    return rows.find((n) => n.serviceId === serviceId);
  },

  async countByService(serviceId: string): Promise<number> {
    return db.notes.where('serviceId').equals(serviceId).count();
  },

  async upsert(note: LocalNote): Promise<number> {
    const existing =
      note.localId != null
        ? await this.getByLocalId(note.localId)
        : await this.findBySecret(note.secret, note.serviceId);

    if (existing?.localId != null) {
      const next: LocalNote = {
        ...existing,
        ...note,
        localId: existing.localId,
        serviceId: existing.serviceId, // never rebind service on upsert
      };
      await db.notes.put(next);
      await noteTagsRepository.replaceForNote(existing.localId, next.tags);
      return existing.localId;
    }

    const localId = (await db.notes.add(note)) as number;
    await noteTagsRepository.replaceForNote(localId, note.tags);
    return localId;
  },

  /**
   * Delete local index only. Does not call PlainNote API.
   * Use remote delete flows in noteService separately.
   */
  async deleteLocalIndex(
    localId: number,
    mode: LocalNoteDeleteMode = 'with-relations',
  ): Promise<void> {
    if (mode === 'with-relations') {
      await noteTagsRepository.removeForNote(localId);
    }
    await db.notes.delete(localId);
  },

  async deleteBySecret(secret: string, serviceId?: string): Promise<void> {
    const existing = await this.findBySecret(secret, serviceId);
    if (existing?.localId == null) return;
    await this.deleteLocalIndex(existing.localId);
  },

  /**
   * Local-only organization fields. Does not bump `updatedAt`
   * (that timestamp reflects remote content edits).
   */
  async patchLocalOrg(
    localId: number,
    patch: {
      favorite?: boolean;
      folderId?: number | null;
      tags?: number[];
    },
  ): Promise<void> {
    const data: Partial<LocalNote> = {};
    if (patch.favorite !== undefined) data.favorite = patch.favorite;
    if (patch.folderId !== undefined) data.folderId = patch.folderId;
    if (patch.tags !== undefined) {
      await noteTagsRepository.replaceForNote(localId, patch.tags);
      return;
    }
    if (Object.keys(data).length) {
      await db.notes.update(localId, data);
    }
  },

  async setFavorite(localId: number, favorite: boolean): Promise<void> {
    await this.patchLocalOrg(localId, { favorite });
  },

  async setFolder(localId: number, folderId: number | null): Promise<void> {
    await this.patchLocalOrg(localId, { folderId });
  },

  async setTags(localId: number, tagIds: number[]): Promise<void> {
    await this.patchLocalOrg(localId, { tags: tagIds });
  },

  async batchSetFavorite(localIds: number[], favorite: boolean): Promise<void> {
    await db.transaction('rw', db.notes, async () => {
      for (const id of localIds) {
        await db.notes.update(id, { favorite });
      }
    });
  },

  async batchSetFolder(localIds: number[], folderId: number | null): Promise<void> {
    await db.transaction('rw', db.notes, async () => {
      for (const id of localIds) {
        await db.notes.update(id, { folderId });
      }
    });
  },

  async batchAddTags(localIds: number[], tagIds: number[]): Promise<void> {
    await db.transaction('rw', db.notes, db.noteTags, async () => {
      for (const id of localIds) {
        const note = await db.notes.get(id);
        if (!note) continue;
        const merged = [...new Set([...(note.tags ?? []), ...tagIds])];
        await noteTagsRepository.replaceForNote(id, merged);
      }
    });
  },

  async touchOpened(localId: number): Promise<void> {
    await db.notes.update(localId, { lastOpenedAt: Date.now() });
  },

  async setSyncStatus(localId: number, syncStatus: SyncStatus): Promise<void> {
    await db.notes.update(localId, { syncStatus });
  },
};
