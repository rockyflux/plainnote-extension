import { describe, expect, it } from 'vitest';
import {
  appendToNoteContent,
  formatPageLinkNote,
  formatSelectionPlain,
  formatSelectionQuote,
  sanitizeClipText,
  sanitizeMarkdownLinkLabel,
  sanitizePageUrl,
} from '@/utils/clip-format';

const zhLabels = { source: '来源', excerptTime: '摘录时间' };

describe('clip-format', () => {
  it('formats markdown quote with source link and excerpt time', () => {
    const out = formatSelectionQuote('hello\nworld', 'Example', 'https://example.com/a', {
      labels: zhLabels,
      excerptAt: new Date('2026-11-13T10:00:00'),
      locale: 'zh-CN',
    });
    expect(out).toContain('> hello\n> world');
    expect(out).toContain('来源：[Example](https://example.com/a)');
    expect(out).toContain('摘录时间：');
  });

  it('formats plain selection with source', () => {
    const out = formatSelectionPlain('hi', 'Title', 'https://example.com', {
      labels: zhLabels,
      excerptAt: Date.now(),
      locale: 'zh-CN',
    });
    expect(out).toContain('hi');
    expect(out).toMatch(/来源：\[Title\]\(https:\/\/example\.com\/?\)/);
  });

  it('formats page link note', () => {
    const page = formatPageLinkNote('Docs', 'https://example.com/docs', {
      labels: zhLabels,
      excerptAt: Date.now(),
    });
    expect(page.title).toBe('Docs');
    expect(page.content).toContain('[Docs](https://example.com/docs)');
    expect(page.content).toContain('摘录时间：');
  });

  it('appends with separator without duplicating empties', () => {
    expect(appendToNoteContent('A', 'B')).toBe('A\n\n---\n\nB');
    expect(appendToNoteContent('', 'B')).toBe('B');
  });

  it('sanitizes untrusted clip input', () => {
    expect(sanitizeClipText('a\u0000b\r\nc')).toBe('ab\nc');
    expect(sanitizeMarkdownLinkLabel('A] B')).toBe('A\\] B');
    expect(sanitizePageUrl('javascript:alert(1)')).toBe('');
    expect(sanitizePageUrl('https://example.com/x')).toBe('https://example.com/x');
  });
});
