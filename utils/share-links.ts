/**
 * Helpers for PlainNote's three-link model.
 * Edit URL is private; Note / Raw are public read links.
 */

const EDIT_PATH = /\/edit\/[^/?#]+/i;

export function isEditUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return /^\/edit\//i.test(u.pathname);
  } catch {
    return EDIT_PATH.test(url);
  }
}

export function isPublicShareUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return /^\/note\//i.test(u.pathname) || /^\/raw\//i.test(u.pathname);
  } catch {
    return /\/(note|raw)\//i.test(url);
  }
}

/** Mask the secret segment in an Edit URL for display. */
export function maskEditUrl(editUrl: string): string {
  return editUrl.replace(EDIT_PATH, '/edit/••••••••••••');
}

/**
 * Guard before persisting share history.
 * Never allow Edit URLs or bare secrets into sharedUrl.
 */
export function assertShareRecordUrlSafe(
  channel: string,
  sharedUrl: string | null,
): void {
  if (channel === 'copy-edit-url') {
    if (sharedUrl) throw new Error('SHARE_RECORD_MUST_NOT_STORE_EDIT_URL');
    return;
  }
  if (!sharedUrl) return;
  if (isEditUrl(sharedUrl)) {
    throw new Error('SHARE_RECORD_MUST_NOT_STORE_EDIT_URL');
  }
}
