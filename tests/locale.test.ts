import { describe, expect, it } from 'vitest';
import { resolveLocale } from '@/utils/locale';

describe('resolveLocale', () => {
  it('respects explicit zh-CN preference', () => {
    expect(resolveLocale('zh-CN')).toBe('zh-CN');
  });

  it('respects explicit en preference', () => {
    expect(resolveLocale('en')).toBe('en');
  });

  it('falls back to en when browser language is non-Chinese', () => {
    const original = navigator.language;
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      get: () => 'en-US',
    });
    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      get: () => ['en-US'],
    });

    expect(resolveLocale('auto')).toBe('en');

    Object.defineProperty(navigator, 'language', {
      configurable: true,
      get: () => original,
    });
  });
});
