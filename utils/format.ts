import type { ResolvedLocale } from '@/types';

function toBcp47(locale: ResolvedLocale): string {
  return locale === 'zh-CN' ? 'zh-CN' : 'en-US';
}

export function formatDateTime(timestamp: number, locale: ResolvedLocale): string {
  return new Intl.DateTimeFormat(toBcp47(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

export function formatDate(timestamp: number, locale: ResolvedLocale): string {
  return new Intl.DateTimeFormat(toBcp47(locale), {
    dateStyle: 'medium',
  }).format(new Date(timestamp));
}

export function formatNumber(value: number, locale: ResolvedLocale): string {
  return new Intl.NumberFormat(toBcp47(locale)).format(value);
}

/** Compact list timestamp: "今天 10:24" / "Today 10:24" or "MM-DD HH:mm". */
export function formatNoteListTime(timestamp: number, locale: ResolvedLocale): string {
  const d = new Date(timestamp);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = new Intl.DateTimeFormat(toBcp47(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  if (sameDay) {
    return locale === 'zh-CN' ? `今天 ${time}` : `Today ${time}`;
  }
  const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${md} ${time}`;
}
