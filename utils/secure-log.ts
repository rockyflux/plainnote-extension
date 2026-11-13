const SECRETISH =
  /(secret|editUrl|edit_url|password|token|credential)/i;

/** Redact sensitive fields before any console output. */
export function redactSensitive<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item)) as T;
  }

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SECRETISH.test(key) || key === 'secret') {
      out[key] = '[REDACTED]';
    } else if (nested && typeof nested === 'object') {
      out[key] = redactSensitive(nested);
    } else {
      out[key] = nested;
    }
  }
  return out as T;
}

export function secureInfo(message: string, payload?: unknown): void {
  if (payload === undefined) {
    console.info(message);
    return;
  }
  console.info(message, redactSensitive(payload));
}

export function secureWarn(message: string, payload?: unknown): void {
  if (payload === undefined) {
    console.warn(message);
    return;
  }
  console.warn(message, redactSensitive(payload));
}
