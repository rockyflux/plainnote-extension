import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/repositories/db', () => {
  const rows: Array<Record<string, unknown> & { id?: number }> = [];
  let seq = 1;
  return {
    db: {
      shareRecords: {
        orderBy() {
          return {
            reverse() {
              return {
                limit(n: number) {
                  return {
                    toArray() {
                      return Promise.resolve(
                        [...rows]
                          .sort((a, b) => Number(b.sharedAt) - Number(a.sharedAt))
                          .slice(0, n),
                      );
                    },
                  };
                },
              };
            },
          };
        },
        async add(item: Record<string, unknown>) {
          const id = seq++;
          rows.push({ ...item, id });
          return id;
        },
        async delete(id: number) {
          const idx = rows.findIndex((r) => r.id === id);
          if (idx >= 0) rows.splice(idx, 1);
        },
        async clear() {
          rows.length = 0;
        },
        async get(id: number) {
          return rows.find((r) => r.id === id);
        },
      },
    },
  };
});

import { shareRecordsRepository } from '@/repositories/share-records-repository';

describe('shareRecordsRepository security', () => {
  beforeEach(async () => {
    await shareRecordsRepository.clear();
  });

  it('rejects storing a URL for copy-edit-url channel', async () => {
    await expect(
      shareRecordsRepository.add({
        noteLocalId: 1,
        serverId: 'abc',
        serviceId: 'svc',
        sharedUrl: 'https://example.com/edit/SECRET',
        title: null,
        channel: 'copy-edit-url',
        sharedAt: Date.now(),
      }),
    ).rejects.toThrow('SHARE_RECORD_MUST_NOT_STORE_EDIT_URL');
  });

  it('rejects edit path even on public channels', async () => {
    await expect(
      shareRecordsRepository.add({
        noteLocalId: 1,
        serverId: 'abc',
        serviceId: 'svc',
        sharedUrl: 'https://example.com/edit/SECRET',
        title: null,
        channel: 'copy-note-url',
        sharedAt: Date.now(),
      }),
    ).rejects.toThrow('SHARE_RECORD_MUST_NOT_STORE_EDIT_URL');
  });

  it('stores note/raw urls and null for edit copies', async () => {
    const noteId = await shareRecordsRepository.add({
      noteLocalId: 2,
      serverId: 'pub',
      serviceId: 'svc',
      sharedUrl: 'https://example.com/note/pub',
      title: 'T',
      channel: 'copy-note-url',
      sharedAt: Date.now(),
    });
    const editId = await shareRecordsRepository.add({
      noteLocalId: 2,
      serverId: 'pub',
      serviceId: 'svc',
      sharedUrl: null,
      title: 'T',
      channel: 'copy-edit-url',
      sharedAt: Date.now(),
    });
    expect(noteId).toBeTypeOf('number');
    expect(editId).toBeTypeOf('number');

    await shareRecordsRepository.remove(noteId);
    const list = await shareRecordsRepository.list();
    expect(list.some((r) => r.id === noteId)).toBe(false);
    expect(list.some((r) => r.id === editId)).toBe(true);
  });
});
