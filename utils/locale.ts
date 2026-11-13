import type { LanguagePreference, ResolvedLocale } from '@/types';

/** Map browser / Chrome UI language to a supported locale. */
export function resolveLocale(preference: LanguagePreference): ResolvedLocale {
  if (preference === 'zh-CN' || preference === 'en') {
    return preference;
  }

  const candidates: string[] = [];

  try {
    const chromeUi = chrome?.i18n?.getUILanguage?.();
    if (chromeUi) candidates.push(chromeUi);
  } catch {
    // ignore — may run outside extension context in unit tests
  }

  if (typeof navigator !== 'undefined') {
    if (navigator.language) candidates.push(navigator.language);
    if (Array.isArray(navigator.languages)) {
      candidates.push(...navigator.languages);
    }
  }

  for (const lang of candidates) {
    const normalized = lang.toLowerCase().replace('_', '-');
    if (normalized === 'zh' || normalized.startsWith('zh-')) {
      return 'zh-CN';
    }
  }

  return 'en';
}

export function isChineseBrowserLanguage(): boolean {
  return resolveLocale('auto') === 'zh-CN';
}
