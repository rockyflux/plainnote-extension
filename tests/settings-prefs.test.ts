import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/types';
import {
  AUTO_SAVE_INTERVAL_DEFAULT_MS,
  AUTO_SAVE_INTERVAL_MAX_MS,
  AUTO_SAVE_INTERVAL_MIN_MS,
} from '@/utils/constants';
import { resolveTheme } from '@/services/theme-service';

/** Mirrors settings-repository clamp without touching IndexedDB. */
function clampAutoSaveInterval(value: unknown): number {
  const n =
    typeof value === 'number' && Number.isFinite(value)
      ? value
      : AUTO_SAVE_INTERVAL_DEFAULT_MS;
  return Math.min(
    AUTO_SAVE_INTERVAL_MAX_MS,
    Math.max(AUTO_SAVE_INTERVAL_MIN_MS, Math.round(n)),
  );
}

describe('settings preference defaults', () => {
  it('ships safe product defaults', () => {
    expect(DEFAULT_SETTINGS.defaultFormat).toBe('markdown');
    expect(DEFAULT_SETTINGS.defaultFolderId).toBeNull();
    expect(DEFAULT_SETTINGS.defaultTagIds).toEqual([]);
    expect(DEFAULT_SETTINGS.autoSaveEnabled).toBe(true);
    expect(DEFAULT_SETTINGS.autoSaveIntervalMs).toBe(450);
    expect(DEFAULT_SETTINGS.markdownPreviewDefault).toBe(false);
    expect(DEFAULT_SETTINGS.copyPublicLinkOnCreate).toBe(false);
    expect(DEFAULT_SETTINGS.openEditorOnCreate).toBe(false);
    expect(DEFAULT_SETTINGS.theme).toBe('system');
    expect(DEFAULT_SETTINGS.editorViewMode).toBe('edit');
    expect(DEFAULT_SETTINGS.editorShowToolbar).toBe(true);
    expect(DEFAULT_SETTINGS.editorLineNumbers).toBe(true);
    expect(DEFAULT_SETTINGS.editorWordWrap).toBe(true);
  });

  it('clamps autosave interval to configured bounds', () => {
    expect(clampAutoSaveInterval(10)).toBe(AUTO_SAVE_INTERVAL_MIN_MS);
    expect(clampAutoSaveInterval(99999)).toBe(AUTO_SAVE_INTERVAL_MAX_MS);
    expect(clampAutoSaveInterval(1200)).toBe(1200);
    expect(clampAutoSaveInterval('bad')).toBe(AUTO_SAVE_INTERVAL_DEFAULT_MS);
  });

  it('resolves explicit theme preferences', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });
});
