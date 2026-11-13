export type ServiceConnectionStatus = 'unknown' | 'ok' | 'error';

/** User-configured PlainNote instance. */
export interface ServiceRecord {
  /** Stable local id (not the note public id). */
  id: string;
  name: string;
  /** Normalized origin, no trailing slash, no credentials. */
  baseUrl: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
  lastCheckedAt: number | null;
  lastStatus: ServiceConnectionStatus;
  lastError: string | null;
  /** Round-trip latency from the last successful/failed probe (ms). */
  lastLatencyMs: number | null;
}

export interface ServiceInput {
  name: string;
  baseUrl: string;
}

export interface ServiceConnectionResult {
  ok: boolean;
  status: ServiceConnectionStatus;
  checkedAt: number;
  message: string;
  latencyMs: number | null;
  preferHttpsHint?: boolean;
}
