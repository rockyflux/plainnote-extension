import type { LocalTag } from '@/types';
import { db } from '@/repositories/db';
import { noteTagsRepository } from '@/repositories/note-tags-repository';

export const tagsRepository = {
  list(): Promise<LocalTag[]> {
    return db.tags.orderBy('name').toArray();
  },

  async get(id: number): Promise<LocalTag | undefined> {
    return db.tags.get(id);
  },

  async create(name: string, color?: string): Promise<number> {
    const now = Date.now();
    return (await db.tags.add({
      name: name.trim(),
      color,
      createdAt: now,
      updatedAt: now,
    })) as number;
  },

  async rename(id: number, name: string): Promise<void> {
    await db.tags.update(id, { name: name.trim(), updatedAt: Date.now() });
  },

  async setColor(id: number, color: string | undefined): Promise<void> {
    await db.tags.update(id, { color, updatedAt: Date.now() });
  },

  async update(
    id: number,
    patch: { name?: string; color?: string | null },
  ): Promise<void> {
    const next: Partial<LocalTag> = { updatedAt: Date.now() };
    if (patch.name !== undefined) next.name = patch.name.trim();
    if (patch.color !== undefined) next.color = patch.color ?? undefined;
    await db.tags.update(id, next);
  },

  async remove(id: number): Promise<void> {
    await db.transaction('rw', db.tags, db.noteTags, db.notes, async () => {
      await noteTagsRepository.removeForTag(id);
      await db.tags.delete(id);
    });
  },
};
