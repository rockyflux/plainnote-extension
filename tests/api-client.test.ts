import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPlainNoteApi } from '@/services/api-client';
import { PlainNoteApiError } from '@/types';

const BASE_A = 'https://plainshare-one.vercel.app';
const BASE_B = 'https://notes.example.com';

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

const sampleFull = {
  id: 'a1b2c3d4e5',
  secret: 'AbCdEfGhIjKlMnOpQrStUvWx',
  title: 'Hello',
  content: 'Body',
  format: 'markdown' as const,
  createdAt: 1735689600000,
  updatedAt: 1735689600000,
  editUrl: `${BASE_A}/edit/AbCdEfGhIjKlMnOpQrStUvWx`,
  noteUrl: `${BASE_A}/note/a1b2c3d4e5`,
  rawUrl: `${BASE_A}/raw/a1b2c3d4e5`,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('plainNoteApi client', () => {
  it('creates a note with JSON body and returns NoteFull', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(`${BASE_A}/api/notes`);
      expect(init?.method).toBe('POST');
      expect(new Headers(init?.headers).get('Content-Type')).toContain('application/json');
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({
        title: 'Hello',
        content: 'Body',
        format: 'markdown',
      });
      // Must not forward local-only fields if somehow passed
      expect(body.tags).toBeUndefined();
      expect(body.folderId).toBeUndefined();
      return jsonResponse(201, sampleFull);
    });

    const api = createPlainNoteApi({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const note = await api.create(BASE_A, {
      title: 'Hello',
      content: 'Body',
      format: 'markdown',
      ...( { tags: ['nope'] } as Record<string, unknown>),
    } as Parameters<typeof api.create>[1]);

    expect(note.id).toBe('a1b2c3d4e5');
    expect(note.secret).toBe('AbCdEfGhIjKlMnOpQrStUvWx');
    expect(note.editUrl).toBe(sampleFull.editUrl);
    expect(note.noteUrl).toBe(sampleFull.noteUrl);
    expect(note.rawUrl).toBe(sampleFull.rawUrl);
  });

  it('updates a note via PATCH with encoded secret', async () => {
    const secret = 'sec/with?chars';
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(`${BASE_A}/api/notes/${encodeURIComponent(secret)}`);
      expect(init?.method).toBe('PATCH');
      return jsonResponse(200, { ...sampleFull, content: 'Updated' });
    });

    const api = createPlainNoteApi({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const note = await api.update(BASE_A, secret, { content: 'Updated' });
    expect(note.content).toBe('Updated');
  });

  it('deletes a note without JSON Content-Type', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(`${BASE_A}/api/notes/secret123`);
      expect(init?.method).toBe('DELETE');
      expect(new Headers(init?.headers).get('Content-Type')).toBeNull();
      return jsonResponse(200, { ok: true });
    });

    const api = createPlainNoteApi({ fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(api.remove(BASE_A, 'secret123')).resolves.toEqual({ ok: true });
  });

  it('maps 404 NOTE_NOT_FOUND', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(404, {
        error: { code: 'NOTE_NOT_FOUND', message: '笔记不存在，或链接已失效 / 已被删除' },
      }),
    );
    const api = createPlainNoteApi({ fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(api.getBySecret(BASE_A, 'missing')).rejects.toMatchObject({
      name: 'PlainNoteApiError',
      status: 404,
      code: 'NOTE_NOT_FOUND',
    });
  });

  it('maps 422 VALIDATION_FAILED with fields', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(422, {
        error: {
          code: 'VALIDATION_FAILED',
          message: '内容校验失败',
          fields: { content: '正文为必填项' },
        },
      }),
    );
    const api = createPlainNoteApi({ fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(api.create(BASE_A, { content: ' ', format: 'text' })).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      fields: { content: '正文为必填项' },
    });
  });

  it('maps 429 RATE_LIMITED with Retry-After', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        429,
        { error: { code: 'RATE_LIMITED', message: 'too many' } },
        { 'Retry-After': '60' },
      ),
    );
    const api = createPlainNoteApi({ fetchImpl: fetchImpl as unknown as typeof fetch });
    try {
      await api.create(BASE_A, { content: 'x', format: 'text' });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(PlainNoteApiError);
      expect((err as PlainNoteApiError).code).toBe('RATE_LIMITED');
      expect((err as PlainNoteApiError).retryAfterSeconds).toBe(60);
    }
  });

  it('times out and throws TIMEOUT', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    const api = createPlainNoteApi({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    });
    const pending = api.getPublic(BASE_A, 'id');
    const expectation = expect(pending).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(150);
    await expectation;
  });

  it('reads raw text/plain bodies', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(`${BASE_A}/raw/a1b2c3d4e5`);
      return new Response('# hi\n', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    });
    const api = createPlainNoteApi({ fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(api.getRaw(BASE_A, 'a1b2c3d4e5')).resolves.toBe('# hi\n');
  });

  it('uses the provided base URL when switching services', async () => {
    const seen: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      seen.push(String(input));
      return jsonResponse(200, {
        ...sampleFull,
        editUrl: `${new URL(String(input)).origin}/edit/x`,
        noteUrl: `${new URL(String(input)).origin}/note/y`,
        rawUrl: `${new URL(String(input)).origin}/raw/y`,
      });
    });

    const api = createPlainNoteApi({ fetchImpl: fetchImpl as unknown as typeof fetch });
    await api.getBySecret(BASE_A, 's1');
    await api.getBySecret(BASE_B, 's2');

    expect(seen[0]).toBe(`${BASE_A}/api/notes/by-secret/s1`);
    expect(seen[1]).toBe(`${BASE_B}/api/notes/by-secret/s2`);
  });
});
