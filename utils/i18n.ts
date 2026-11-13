import { createI18n } from 'vue-i18n';
import en from '@/locales/en.json';
import zhCN from '@/locales/zh-CN.json';
import type { LanguagePreference, ResolvedLocale } from '@/types';
import { resolveLocale } from '@/utils/locale';

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN,
  },
});

export function applyLocale(preference: LanguagePreference): ResolvedLocale {
  const locale = resolveLocale(preference);
  i18n.global.locale.value = locale;
  return locale;
}

export type MessageSchema = typeof en;
