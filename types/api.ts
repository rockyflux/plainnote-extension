export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'NOTE_NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export class PlainNoteApiError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode | string,
    message: string,
    public fields?: Record<string, string>,
    public retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'PlainNoteApiError';
  }
}

export interface DeleteNoteResult {
  ok: boolean;
}

export interface ApiClientOptions {
  /** Request timeout in ms. Default 15000. */
  timeoutMs?: number;
  /** Optional fetch override (tests). */
  fetchImpl?: typeof fetch;
}
