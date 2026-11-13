import { describe, expect, it } from 'vitest';
import { detectNoteFormat, stripToPlainText, titleFromContent } from '@/utils/note-title';

describe('note-title', () => {
  it('strips markdown markers to plain text', () => {
    expect(stripToPlainText('# Hello **world**\n- item')).toBe('Hello world item');
    expect(stripToPlainText('> quote\n[link](https://x.com)')).toBe('quote link');
  });

  it('takes first 30 plain characters as title', () => {
    const body = '## 浏览器扩展开发笔记\n\n- 支持 **Markdown**\n- 本地标签';
    const title = titleFromContent(body, 30);
    expect(title).toBe('浏览器扩展开发笔记 支持 Markdown 本地标签'.slice(0, 30));
    expect([...title].length).toBeLessThanOrEqual(30);
  });

  it('returns empty for empty / symbol-only content', () => {
    expect(titleFromContent('')).toBe('');
    expect(titleFromContent('***\n---')).toBe('');
  });

  it('detects markdown vs plain text', () => {
    expect(detectNoteFormat('just a plain sentence')).toBe('text');
    expect(detectNoteFormat('# Heading\nbody')).toBe('markdown');
    expect(detectNoteFormat('- item one')).toBe('markdown');
    expect(detectNoteFormat('see [docs](https://example.com)')).toBe('markdown');
    expect(detectNoteFormat('')).toBe('text');
  });
});
