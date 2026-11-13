import type { ResolvedTheme, ThemePreference } from '@/types';

const THEME_ATTR = 'data-theme';
const STORAGE_MIRROR_KEY = 'plainnote.theme';

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    return systemPrefersDark() ? 'dark' : 'light';
  }
  return preference;
}

/** Apply resolved theme to documentElement. Safe in non-DOM test environments. */
export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute(THEME_ATTR, resolved);
    document.documentElement.style.colorScheme = resolved;
  }
  try {
    void browser.storage.local.set({ [STORAGE_MIRROR_KEY]: preference });
  } catch {
    // Non-extension / test environments
  }
  return resolved;
}

let mediaListener: ((event: MediaQueryListEvent) => void) | null = null;
let currentPreference: ThemePreference = 'system';

/** Keep system theme in sync when preference is `system`. */
export function watchSystemTheme(preference: ThemePreference): void {
  currentPreference = preference;
  if (typeof window === 'undefined' || !window.matchMedia) return;

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mediaListener) {
    mq.removeEventListener('change', mediaListener);
    mediaListener = null;
  }

  if (preference !== 'system') return;

  mediaListener = () => {
    if (currentPreference === 'system') {
      applyTheme('system');
    }
  };
  mq.addEventListener('change', mediaListener);
}

export const themeService = {
  resolve: resolveTheme,
  apply: applyTheme,
  watchSystem: watchSystemTheme,
};
