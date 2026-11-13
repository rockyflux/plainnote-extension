export type ServerUrlErrorCode =
  | 'EMPTY'
  | 'INVALID_URL'
  | 'PROTOCOL'
  | 'CREDENTIALS'
  | 'HASH_OR_QUERY';

export class ServerUrlError extends Error {
  constructor(public code: ServerUrlErrorCode) {
    super(code);
    this.name = 'ServerUrlError';
  }
}

export interface NormalizeServerUrlOptions {
  /** When true, reject URLs that include username/password. Default true. */
  rejectCredentials?: boolean;
  /** When true, strip path to origin only. Default true for PlainNote base. */
  originOnly?: boolean;
}

/**
 * Normalize user-entered server origin:
 * - trim + strip trailing slashes
 * - http/https only
 * - reject embedded credentials
 * - default to origin-only (no path/query/hash)
 */
export function normalizeServerBaseUrl(
  input: string,
  options: NormalizeServerUrlOptions = {},
): string {
  const rejectCredentials = options.rejectCredentials !== false;
  const originOnly = options.originOnly !== false;

  const trimmed = input.trim();
  if (!trimmed) throw new ServerUrlError('EMPTY');

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new ServerUrlError('INVALID_URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ServerUrlError('PROTOCOL');
  }

  if (rejectCredentials && (url.username || url.password)) {
    throw new ServerUrlError('CREDENTIALS');
  }

  if (originOnly) {
    // Drop path/query/hash — PlainNote APIs are rooted at origin.
    return `${url.protocol}//${url.host}`;
  }

  if (url.hash || url.search) {
    throw new ServerUrlError('HASH_OR_QUERY');
  }

  const path = url.pathname.replace(/\/+$/, '');
  return path && path !== '/'
    ? `${url.protocol}//${url.host}${path}`
    : `${url.protocol}//${url.host}`;
}

export function joinApiPath(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

export function isHttpsUrl(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).protocol === 'https:';
  } catch {
    return false;
  }
}
