import type { LocalFolder } from '@/types';
import { db } from '@/repositories/db';

export const foldersRepository = {
  list(): Promise<LocalFolder[]> {
    return db.folders.orderBy('name').toArray();
  },

  async get(id: number): Promise<LocalFolder | undefined> {
    return db.folders.get(id);
  },

  async create(name: string): Promise<number> {
    const now = Date.now();
    return (await db.folders.add({
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
    })) as number;
  },

  async rename(id: number, name: string): Promise<void> {
    await db.folders.update(id, { name: name.trim(), updatedAt: Date.now() });
  },

  async remove(id: number): Promise<void> {
    await db.transaction('rw', db.folders, db.notes, async () => {
      const bound = await db.notes.where('folderId').equals(id).toArray();
      for (const note of bound) {
        if (note.localId == null) continue;
        await db.notes.update(note.localId, { folderId: null });
      }
      await db.folders.delete(id);
    });
  },
};
