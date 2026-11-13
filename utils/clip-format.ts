/**
 * Build clip body for web excerpt / page link notes.
 * Page content is untrusted — sanitize before embedding in Markdown.
 */

export interface ClipLabels {
  /** e.g. "来源" / "Source" */
  source: string;
  /** e.g. "摘录时间" / "Clipped at" */
  excerptTime: string;
}

const DEFAULT_LABELS: ClipLabels = {
  source: 'Source',
  excerptTime: 'Clipped at',
};

/** Strip control chars and normalize newlines. */
export function sanitizeClipText(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

/** Escape characters that break Markdown link labels. */
export function sanitizeMarkdownLinkLabel(label: string): string {
  return sanitizeClipText(label)
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

/** Only allow http(s) page URLs in generated Markdown links. */
export function sanitizePageUrl(url: string): string {
  const trimmed = sanitizeClipText(url);
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function formatExcerptTime(at: Date | number, locale?: string): string {
  const d = typeof at === 'number' ? new Date(at) : at;
  const bcp = locale === 'zh-CN' ? 'zh-CN' : locale === 'en' ? 'en-US' : undefined;
  return new Intl.DateTimeFormat(bcp, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

function sourceLine(pageTitle: string, pageUrl: string, labels: ClipLabels): string {
  const title = sanitizeMarkdownLinkLabel(pageTitle || pageUrl || 'Untitled');
  const url = sanitizePageUrl(pageUrl);
  if (url) return `${labels.source}：[${title}](${url})`;
  return `${labels.source}：${title}`;
}

/**
 * Markdown quote clip:
 *
 * > selected text
 *
 * 来源：[page title](page url)
 *
 * 摘录时间：…
 */
export function formatSelectionQuote(
  selection: string,
  pageTitle: string,
  pageUrl: string,
  options?: {
    labels?: Partial<ClipLabels>;
    excerptAt?: Date | number;
    locale?: string;
  },
): string {
  const labels = { ...DEFAULT_LABELS, ...options?.labels };
  const text = sanitizeClipText(selection);
  const quoted = text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
  const source = sourceLine(pageTitle, pageUrl, labels);
  const when = formatExcerptTime(options?.excerptAt ?? Date.now(), options?.locale);
  return `${quoted}\n\n${source}\n\n${labels.excerptTime}：${when}`;
}

/** Plain selection + source + excerpt time (non-quote). */
export function formatSelectionPlain(
  selection: string,
  pageTitle: string,
  pageUrl: string,
  options?: {
    labels?: Partial<ClipLabels>;
    excerptAt?: Date | number;
    locale?: string;
  },
): string {
  const labels = { ...DEFAULT_LABELS, ...options?.labels };
  const text = sanitizeClipText(selection);
  const source = sourceLine(pageTitle, pageUrl, labels);
  const when = formatExcerptTime(options?.excerptAt ?? Date.now(), options?.locale);
  return `${text}\n\n${source}\n\n${labels.excerptTime}：${when}`;
}

export function formatPageLinkNote(
  pageTitle: string,
  pageUrl: string,
  options?: { labels?: Partial<ClipLabels>; excerptAt?: Date | number; locale?: string },
): {
  title: string;
  content: string;
} {
  const labels = { ...DEFAULT_LABELS, ...options?.labels };
  const title = sanitizeClipText(pageTitle || pageUrl || 'Untitled');
  const url = sanitizePageUrl(pageUrl);
  const when = formatExcerptTime(options?.excerptAt ?? Date.now(), options?.locale);
  const link = url ? `[${sanitizeMarkdownLinkLabel(title)}](${url})` : title;
  return {
    title: title.slice(0, 200),
    content: `${link}\n\n${labels.excerptTime}：${when}`,
  };
}

export function appendToNoteContent(existing: string, addition: string): string {
  const a = existing.replace(/\s+$/, '');
  const b = addition.replace(/^\s+/, '');
  if (!a) return b;
  return `${a}\n\n---\n\n${b}`;
}
