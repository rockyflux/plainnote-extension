import { normalizeServerBaseUrl } from '@/utils/url';

/** Chrome / Edge match pattern for a PlainNote origin. */
export function originHostPermission(baseUrl: string): string {
  const origin = normalizeServerBaseUrl(baseUrl);
  return `${origin}/*`;
}

export async function hasHostPermission(baseUrl: string): Promise<boolean> {
  const origins = [originHostPermission(baseUrl)];
  try {
    if (!browser?.permissions?.contains) return true;
    return await browser.permissions.contains({ origins });
  } catch {
    return true;
  }
}

/**
 * Request access to a specific PlainNote origin.
 * Returns false when the user denies (or the API is unavailable).
 */
export async function ensureHostPermission(baseUrl: string): Promise<boolean> {
  const origins = [originHostPermission(baseUrl)];
  try {
    if (!browser?.permissions?.contains || !browser?.permissions?.request) {
      return true;
    }
    const already = await browser.permissions.contains({ origins });
    if (already) return true;
    return await browser.permissions.request({ origins });
  } catch {
    return false;
  }
}

export async function listGrantedHostPermissions(): Promise<string[]> {
  try {
    if (!browser?.permissions?.getAll) return [];
    const all = await browser.permissions.getAll();
    return all.origins ?? [];
  } catch {
    return [];
  }
}
