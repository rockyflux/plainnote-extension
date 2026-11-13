import type {
  ApiClientOptions,
  ApiErrorBody,
  CreateNotePayload,
  DeleteNoteResult,
  NoteFull,
  NotePublic,
  UpdateNotePayload,
} from '@/types';
import { PlainNoteApiError } from '@/types';
import { joinApiPath } from '@/utils/url';

const DEFAULT_TIMEOUT_MS = 15_000;

function mapStatusToCode(status: number, code?: string): string {
  if (code) return code;
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 404) return 'NOTE_NOT_FOUND';
  if (status === 422) return 'VALIDATION_FAILED';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'INTERNAL_ERROR';
  return 'UNKNOWN';
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  );
}

/**
 * Low-level PlainNote HTTP client.
 * Mirrors `src/web/lib/api.ts` behavior with absolute baseUrl + timeout.
 * Never invents endpoints or request fields.
 */
export function createPlainNoteApi(clientOptions: ApiClientOptions = {}) {
  const timeoutMs = clientOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = clientOptions.fetchImpl ?? fetch;

  async function requestJson<T>(
    baseUrl: string,
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(options.headers);
    // Match upstream: only set JSON Content-Type when there is a body.
    // Empty DELETE + application/json can make Fastify return 400.
    if (options.body != null && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json; charset=utf-8');
    }
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    const controller = new AbortController();
    const external = options.signal;
    const onExternalAbort = () => controller.abort();
    if (external) {
      if (external.aborted) controller.abort();
      else external.addEventListener('abort', onExternalAbort, { once: true });
    }
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetchImpl(joinApiPath(baseUrl, path), {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      if (isAbortError(err)) {
        throw new PlainNoteApiError(0, 'TIMEOUT', 'Request timed out');
      }
      throw new PlainNoteApiError(0, 'NETWORK_ERROR', 'Network error');
    } finally {
      clearTimeout(timer);
      if (external) external.removeEventListener('abort', onExternalAbort);
    }

    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    let body: unknown = null;
    if (isJson) {
      try {
        body = await res.json();
      } catch {
        body = null;
      }
    }

    if (!res.ok) {
      const envelope = body as ApiErrorBody | null;
      const retryAfter = res.headers.get('Retry-After');
      throw new PlainNoteApiError(
        res.status,
        mapStatusToCode(res.status, envelope?.error?.code),
        envelope?.error?.message ?? `Request failed (${res.status})`,
        envelope?.error?.fields,
        retryAfter ? Number(retryAfter) : undefined,
      );
    }

    return body as T;
  }

  async function requestRawText(baseUrl: string, id: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetchImpl(joinApiPath(baseUrl, `/raw/${encodeURIComponent(id)}`), {
        method: 'GET',
        headers: { Accept: 'text/plain' },
        signal: controller.signal,
      });
    } catch (err) {
      if (isAbortError(err)) {
        throw new PlainNoteApiError(0, 'TIMEOUT', 'Request timed out');
      }
      throw new PlainNoteApiError(0, 'NETWORK_ERROR', 'Network error');
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    if (!res.ok) {
      // Raw errors are plaintext, not JSON (see raw.ts).
      throw new PlainNoteApiError(
        res.status,
        res.status === 404 ? 'NOTE_NOT_FOUND' : mapStatusToCode(res.status),
        text.trim() || `Request failed (${res.status})`,
      );
    }
    return text;
  }

  /** Strip unknown keys — only server-supported create fields. */
  function sanitizeCreatePayload(payload: CreateNotePayload): CreateNotePayload {
    const out: CreateNotePayload = {
      content: payload.content,
      format: payload.format,
    };
    if ('title' in payload) out.title = payload.title ?? null;
    if ('timezone' in payload) out.timezone = payload.timezone ?? null;
    if ('language' in payload) out.language = payload.language ?? null;
    return out;
  }

  function sanitizeUpdatePayload(payload: UpdateNotePayload): UpdateNotePayload {
    const out: UpdateNotePayload = {};
    if ('title' in payload) out.title = payload.title;
    if ('content' in payload) out.content = payload.content;
    if ('format' in payload) out.format = payload.format;
    if ('id' in payload) out.id = payload.id;
    return out;
  }

  return {
    create(baseUrl: string, payload: CreateNotePayload): Promise<NoteFull> {
      return requestJson<NoteFull>(baseUrl, '/api/notes', {
        method: 'POST',
        body: JSON.stringify(sanitizeCreatePayload(payload)),
      });
    },

    getBySecret(baseUrl: string, secret: string): Promise<NoteFull> {
      return requestJson<NoteFull>(
        baseUrl,
        `/api/notes/by-secret/${encodeURIComponent(secret)}`,
      );
    },

    getPublic(baseUrl: string, id: string): Promise<NotePublic> {
      return requestJson<NotePublic>(baseUrl, `/api/notes/${encodeURIComponent(id)}`);
    },

    update(baseUrl: string, secret: string, payload: UpdateNotePayload): Promise<NoteFull> {
      return requestJson<NoteFull>(baseUrl, `/api/notes/${encodeURIComponent(secret)}`, {
        method: 'PATCH',
        body: JSON.stringify(sanitizeUpdatePayload(payload)),
      });
    },

    remove(baseUrl: string, secret: string): Promise<DeleteNoteResult> {
      return requestJson<DeleteNoteResult>(
        baseUrl,
        `/api/notes/${encodeURIComponent(secret)}`,
        { method: 'DELETE' },
      );
    },

    getRaw(baseUrl: string, id: string): Promise<string> {
      return requestRawText(baseUrl, id);
    },
  };
}

/** Default singleton used by the extension. */
export const plainNoteApi = createPlainNoteApi();

export type PlainNoteApi = ReturnType<typeof createPlainNoteApi>;
