/**
 * Derive a note title from body content:
 * strip Markdown / symbols, then take the first N plain-text characters.
 */
export function stripToPlainText(source: string): string {
  let text = source.replace(/\r\n/g, '\n');

  // Fenced code blocks → keep inner text only
  text = text.replace(/```[\w-]*\n?([\s\S]*?)```/g, '$1');
  // Inline code
  text = text.replace(/`([^`]+)`/g, '$1');
  // Images ![alt](url) → alt
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Links [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // Headings / quotes / lists / hr markers
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^>\s?/gm, '');
  text = text.replace(/^[-*+]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');
  text = text.replace(/^(-{3,}|\*{3,}|_{3,})\s*$/gm, '');
  // Emphasis / strikethrough markers
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  text = text.replace(/~~(.*?)~~/g, '$1');
  // HTML-ish tags if any
  text = text.replace(/<\/?[^>]+>/g, '');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/** First `maxChars` characters of plain text derived from content. */
export function titleFromContent(content: string, maxChars = 30): string {
  const plain = stripToPlainText(content);
  if (!plain) return '';
  return [...plain].slice(0, maxChars).join('');
}

/**
 * Lightweight Markdown detection for Popup auto-format.
 * Looks for common Markdown markers; otherwise treats as plain text.
 */
export function detectNoteFormat(content: string): 'markdown' | 'text' {
  const text = content.replace(/\r\n/g, '\n');
  if (!text.trim()) return 'text';

  const patterns = [
    /^#{1,6}\s+\S/m, // heading
    /^>\s?\S/m, // blockquote
    /^(-|\*|\+)\s+\S/m, // unordered list
    /^\d+\.\s+\S/m, // ordered list
    /```/, // fenced code
    /\[[^\]]+\]\([^)]+\)/, // link
    /!\[[^\]]*\]\([^)]+\)/, // image
    /(\*\*|__)[^*\n]+(\*\*|__)/, // bold
    /(?<!\*)\*[^*\n]+\*(?!\*)|(?<!_)_[^_\n]+_(?!_)/, // italic
    /~~[^~\n]+~~/, // strike
    /`[^`\n]+`/, // inline code
    /^(-{3,}|\*{3,}|_{3,})\s*$/m, // hr
  ];

  return patterns.some((re) => re.test(text)) ? 'markdown' : 'text';
}
