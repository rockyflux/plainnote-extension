import { describe, expect, it, vi } from 'vitest';
import { createNoteService } from '@/services/note-service';
import type { LocalNote, NoteFull } from '@/types';

const BASE_A = 'https://plainshare-one.vercel.app';
const BASE_B = 'https://notes.example.com';

function full(overrides: Partial<NoteFull> = {}): NoteFull {
  return {
    id: 'pub1',
    secret: 'secret1',
    title: 'T',
    content: 'C',
    format: 'markdown',
    createdAt: 1,
    updatedAt: 2,
    editUrl: `${BASE_A}/edit/secret1`,
    noteUrl: `${BASE_A}/note/pub1`,
    rawUrl: `${BASE_A}/raw/pub1`,
    ...overrides,
  };
}

function local(overrides: Partial<LocalNote> = {}): LocalNote {
  return {
    localId: 1,
    serverId: 'pub1',
    secret: 'secret1',
    serviceId: 'svc-a',
    title: 'T',
    content: 'C',
    format: 'markdown',
    editUrl: `${BASE_A}/edit/secret1`,
    noteUrl: `${BASE_A}/note/pub1`,
    rawUrl: `${BASE_A}/raw/pub1`,
    folderId: null,
    tags: [],
    favorite: false,
    createdAt: 1,
    updatedAt: 2,
    lastOpenedAt: null,
    syncStatus: 'synced',
    ...overrides,
  };
}

describe('noteService multi-service isolation', () => {
  it('creates against the resolved service base URL and keeps serviceId', async () => {
    const api = {
      create: vi.fn(async (baseUrl: string) => {
        expect(baseUrl).toBe(BASE_A);
        return full();
      }),
      getBySecret: vi.fn(),
      getPublic: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      getRaw: vi.fn(),
    };

    const notesRepo = {
      upsert: vi.fn(async () => 10),
      findBySecret: vi.fn(),
      getByLocalId: vi.fn(),
      deleteLocalIndex: vi.fn(),
      deleteBySecret: vi.fn(),
      touchOpened: vi.fn(),
      list: vi.fn(async () => []),
    };

    const service = createNoteService({
      api: api as never,
      resolveBaseUrl: async (id) => {
        expect(id).toBe('svc-a');
        return BASE_A;
      },
      notesRepo: notesRepo as never,
      noteTagsRepo: { replaceForNote: vi.fn() } as never,
    });

    const note = await service.create(
      'svc-a',
      { content: 'C', format: 'markdown', title: 'T' },
      { tagIds: [3], folderId: 2 },
    );

    expect(note.serviceId).toBe('svc-a');
    expect(note.localId).toBe(10);
    expect(note.editUrl).toBe(`${BASE_A}/edit/secret1`);
    expect(api.create).toHaveBeenCalledWith(
      BASE_A,
      expect.objectContaining({ content: 'C', format: 'markdown' }),
    );
    // Local tags must not be in API payload
    const [, payload] = api.create.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(payload).not.toHaveProperty('tags');
    expect(payload).not.toHaveProperty('folderId');
    expect(payload).not.toHaveProperty('favorite');
  });

  it('rejects update when local note belongs to another service', async () => {
    const service = createNoteService({
      api: {
        create: vi.fn(),
        getBySecret: vi.fn(),
        getPublic: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        getRaw: vi.fn(),
      } as never,
      resolveBaseUrl: async () => BASE_B,
      notesRepo: {
        findBySecret: vi.fn(async () => local({ serviceId: 'svc-a' })),
        upsert: vi.fn(),
        getByLocalId: vi.fn(),
        deleteLocalIndex: vi.fn(),
        deleteBySecret: vi.fn(),
        touchOpened: vi.fn(),
        list: vi.fn(async () => []),
      } as never,
    });

    await expect(
      service.update('svc-b', 'secret1', { content: 'Nope' }),
    ).rejects.toThrow('SERVICE_MISMATCH');
  });

  it('updates using the bound service base URL, not a foreign one', async () => {
    const api = {
      create: vi.fn(),
      getBySecret: vi.fn(),
      getPublic: vi.fn(),
      update: vi.fn(async (baseUrl: string) => {
        expect(baseUrl).toBe(BASE_A);
        return full({ content: 'New', updatedAt: 9 });
      }),
      remove: vi.fn(),
      getRaw: vi.fn(),
    };

    const existing = local({ serviceId: 'svc-a' });
    const service = createNoteService({
      api: api as never,
      resolveBaseUrl: async (id) => (id === 'svc-a' ? BASE_A : BASE_B),
      notesRepo: {
        findBySecret: vi.fn(async () => existing),
        upsert: vi.fn(async () => 1),
        getByLocalId: vi.fn(),
        deleteLocalIndex: vi.fn(),
        deleteBySecret: vi.fn(),
        touchOpened: vi.fn(),
        list: vi.fn(async () => []),
      } as never,
    });

    const updated = await service.update('svc-a', 'secret1', { content: 'New' });
    expect(updated.content).toBe('New');
    expect(updated.serviceId).toBe('svc-a');
  });

  it('deletes remotely then clears local index', async () => {
    const api = {
      create: vi.fn(),
      getBySecret: vi.fn(),
      getPublic: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(async (baseUrl: string, secret: string) => {
        expect(baseUrl).toBe(BASE_A);
        expect(secret).toBe('secret1');
        return { ok: true };
      }),
      getRaw: vi.fn(),
    };
    const notesRepo = {
      findBySecret: vi.fn(async () => local()),
      upsert: vi.fn(),
      getByLocalId: vi.fn(),
      deleteLocalIndex: vi.fn(),
      deleteBySecret: vi.fn(),
      touchOpened: vi.fn(),
      list: vi.fn(async () => []),
    };

    const service = createNoteService({
      api: api as never,
      resolveBaseUrl: async () => BASE_A,
      notesRepo: notesRepo as never,
    });

    await service.removeRemoteAndLocal('svc-a', 'secret1');
    expect(api.remove).toHaveBeenCalledOnce();
    expect(notesRepo.deleteLocalIndex).toHaveBeenCalledWith(1);
  });
});
