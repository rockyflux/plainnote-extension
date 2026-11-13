import { describe, expect, it } from 'vitest';
import { filterNotes, noteExcerpt, sortNotes } from '@/utils/note-filters';
import type { LocalNote } from '@/types';

function note(partial: Partial<LocalNote> & { localId: number }): LocalNote {
  return {
    serverId: 'id',
    secret: 'secret',
    serviceId: 'default',
    title: null,
    content: '',
    format: 'markdown',
    editUrl: 'https://x/edit/s',
    noteUrl: 'https://x/note/i',
    rawUrl: 'https://x/raw/i',
    folderId: null,
    tags: [],
    favorite: false,
    createdAt: 1,
    updatedAt: 1,
    lastOpenedAt: null,
    syncStatus: 'synced',
    ...partial,
  };
}

describe('note-filters', () => {
  const sample = [
    note({ localId: 1, title: 'Alpha', content: 'hello world', updatedAt: 3, favorite: true, tags: [1] }),
    note({ localId: 2, title: 'Beta', content: 'other', updatedAt: 2, folderId: 9, lastOpenedAt: 10 }),
    note({ localId: 3, title: 'Gamma', content: 'hello', updatedAt: 1, tags: [2], lastOpenedAt: 5 }),
  ];

  it('filters by query across title and body', () => {
    expect(filterNotes(sample, { query: 'hello' }).map((n) => n.localId)).toEqual([1, 3]);
  });

  it('filters by query across tag names', () => {
    const tagNamesById = new Map([
      [1, 'PlainNote'],
      [2, 'Browser'],
    ]);
    expect(
      filterNotes(sample, { query: 'browser', tagNamesById }).map((n) => n.localId),
    ).toEqual([3]);
  });

  it('filters favorites, folder, tag, opened', () => {
    expect(filterNotes(sample, { favoriteOnly: true })).toHaveLength(1);
    expect(filterNotes(sample, { folderId: 9 })).toHaveLength(1);
    expect(filterNotes(sample, { folderId: null })).toHaveLength(2);
    expect(filterNotes(sample, { tagId: 2 })).toHaveLength(1);
    expect(filterNotes(sample, { openedOnly: true })).toHaveLength(2);
  });

  it('sorts by updated and opened', () => {
    expect(sortNotes(sample, 'updatedDesc').map((n) => n.localId)).toEqual([1, 2, 3]);
    expect(sortNotes(sample, 'openedDesc').map((n) => n.localId)).toEqual([2, 3, 1]);
  });

  it('builds excerpt', () => {
    expect(noteExcerpt('a\n\nb  c', 4)).toBe('a b ');
  });
});
