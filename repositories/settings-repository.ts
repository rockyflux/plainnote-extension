import type {
  EditorViewMode,
  ExtensionSettings,
  LanguagePreference,
  NoteFormat,
  ThemePreference,
} from '@/types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_SERVICE_ID,
  EDITOR_FONT_SIZE_DEFAULT,
  EDITOR_FONT_SIZE_MAX,
  EDITOR_FONT_SIZE_MIN,
} from '@/types';
import { db } from '@/repositories/db';
import {
  AUTO_SAVE_INTERVAL_DEFAULT_MS,
  AUTO_SAVE_INTERVAL_MAX_MS,
  AUTO_SAVE_INTERVAL_MIN_MS,
  SETTINGS_KEYS,
  STORAGE_KEYS,
} from '@/utils/constants';

function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === 'auto' || value === 'zh-CN' || value === 'en';
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function isNoteFormat(value: unknown): value is NoteFormat {
  return value === 'markdown' || value === 'text';
}

function isEditorViewMode(value: unknown): value is EditorViewMode {
  return value === 'edit' || value === 'preview' || value === 'split';
}

function clampAutoSaveInterval(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : AUTO_SAVE_INTERVAL_DEFAULT_MS;
  return Math.min(
    AUTO_SAVE_INTERVAL_MAX_MS,
    Math.max(AUTO_SAVE_INTERVAL_MIN_MS, Math.round(n)),
  );
}

function clampFontSize(value: unknown): number {
  const n =
    typeof value === 'number' && Number.isFinite(value) ? value : EDITOR_FONT_SIZE_DEFAULT;
  return Math.min(EDITOR_FONT_SIZE_MAX, Math.max(EDITOR_FONT_SIZE_MIN, Math.round(n)));
}

async function getValue<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key);
  return row?.value as T | undefined;
}

async function setValue(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value, updatedAt: Date.now() });
}

function normalizeSettings(partial: Partial<ExtensionSettings> = {}): ExtensionSettings {
  const defaultTagIds = Array.isArray(partial.defaultTagIds)
    ? partial.defaultTagIds.filter((id): id is number => typeof id === 'number')
    : DEFAULT_SETTINGS.defaultTagIds;

  // Legacy: markdownPreviewDefault true with no editorViewMode → open in preview.
  let editorViewMode = isEditorViewMode(partial.editorViewMode)
    ? partial.editorViewMode
    : DEFAULT_SETTINGS.editorViewMode;
  if (
    partial.editorViewMode == null &&
    partial.markdownPreviewDefault === true &&
    editorViewMode === 'edit'
  ) {
    editorViewMode = 'preview';
  }

  return {
    language: isLanguagePreference(partial.language) ? partial.language : DEFAULT_SETTINGS.language,
    theme: isThemePreference(partial.theme) ? partial.theme : DEFAULT_SETTINGS.theme,
    defaultServiceId:
      typeof partial.defaultServiceId === 'string' && partial.defaultServiceId
        ? partial.defaultServiceId
        : DEFAULT_SERVICE_ID,
    defaultFormat: isNoteFormat(partial.defaultFormat)
      ? partial.defaultFormat
      : DEFAULT_SETTINGS.defaultFormat,
    defaultFolderId:
      partial.defaultFolderId === null || typeof partial.defaultFolderId === 'number'
        ? partial.defaultFolderId
        : DEFAULT_SETTINGS.defaultFolderId,
    defaultTagIds,
    autoSaveEnabled:
      typeof partial.autoSaveEnabled === 'boolean'
        ? partial.autoSaveEnabled
        : DEFAULT_SETTINGS.autoSaveEnabled,
    autoSaveIntervalMs: clampAutoSaveInterval(
      partial.autoSaveIntervalMs ?? DEFAULT_SETTINGS.autoSaveIntervalMs,
    ),
    copyPublicLinkOnCreate:
      typeof partial.copyPublicLinkOnCreate === 'boolean'
        ? partial.copyPublicLinkOnCreate
        : DEFAULT_SETTINGS.copyPublicLinkOnCreate,
    openEditorOnCreate:
      typeof partial.openEditorOnCreate === 'boolean'
        ? partial.openEditorOnCreate
        : DEFAULT_SETTINGS.openEditorOnCreate,
    editorViewMode,
    markdownPreviewDefault:
      typeof partial.markdownPreviewDefault === 'boolean'
        ? partial.markdownPreviewDefault
        : editorViewMode !== 'edit',
    editorFontSize: clampFontSize(partial.editorFontSize ?? DEFAULT_SETTINGS.editorFontSize),
    editorFontFamily:
      typeof partial.editorFontFamily === 'string' && partial.editorFontFamily.trim()
        ? partial.editorFontFamily.trim()
        : DEFAULT_SETTINGS.editorFontFamily,
    editorLineNumbers:
      typeof partial.editorLineNumbers === 'boolean'
        ? partial.editorLineNumbers
        : DEFAULT_SETTINGS.editorLineNumbers,
    editorWordWrap:
      typeof partial.editorWordWrap === 'boolean'
        ? partial.editorWordWrap
        : DEFAULT_SETTINGS.editorWordWrap,
    editorShowToolbar:
      typeof partial.editorShowToolbar === 'boolean'
        ? partial.editorShowToolbar
        : DEFAULT_SETTINGS.editorShowToolbar,
  };
}

const ALL_KEYS = Object.values(SETTINGS_KEYS);

export const settingsRepository = {
  async getAll(): Promise<ExtensionSettings> {
    const entries = await Promise.all(
      ALL_KEYS.map(async (key) => [key, await getValue<unknown>(key)] as const),
    );
    const raw = Object.fromEntries(entries) as Partial<ExtensionSettings>;
    return normalizeSettings(raw);
  },

  async save(settings: ExtensionSettings): Promise<ExtensionSettings> {
    const normalized = normalizeSettings(settings);
    await db.transaction('rw', db.settings, async () => {
      await setValue(SETTINGS_KEYS.language, normalized.language);
      await setValue(SETTINGS_KEYS.theme, normalized.theme);
      await setValue(SETTINGS_KEYS.defaultServiceId, normalized.defaultServiceId);
      await setValue(SETTINGS_KEYS.defaultFormat, normalized.defaultFormat);
      await setValue(SETTINGS_KEYS.defaultFolderId, normalized.defaultFolderId);
      await setValue(SETTINGS_KEYS.defaultTagIds, normalized.defaultTagIds);
      await setValue(SETTINGS_KEYS.autoSaveEnabled, normalized.autoSaveEnabled);
      await setValue(SETTINGS_KEYS.autoSaveIntervalMs, normalized.autoSaveIntervalMs);
      await setValue(SETTINGS_KEYS.copyPublicLinkOnCreate, normalized.copyPublicLinkOnCreate);
      await setValue(SETTINGS_KEYS.openEditorOnCreate, normalized.openEditorOnCreate);
      await setValue(SETTINGS_KEYS.editorViewMode, normalized.editorViewMode);
      await setValue(SETTINGS_KEYS.markdownPreviewDefault, normalized.markdownPreviewDefault);
      await setValue(SETTINGS_KEYS.editorFontSize, normalized.editorFontSize);
      await setValue(SETTINGS_KEYS.editorFontFamily, normalized.editorFontFamily);
      await setValue(SETTINGS_KEYS.editorLineNumbers, normalized.editorLineNumbers);
      await setValue(SETTINGS_KEYS.editorWordWrap, normalized.editorWordWrap);
      await setValue(SETTINGS_KEYS.editorShowToolbar, normalized.editorShowToolbar);
    });

    try {
      await browser.storage.local.set({
        [STORAGE_KEYS.settings]: {
          language: normalized.language,
          theme: normalized.theme,
          defaultServiceId: normalized.defaultServiceId,
        },
      });
    } catch {
      // Non-extension test environments
    }

    return normalized;
  },

  /** One-time migrate from legacy browser.storage settings blob. */
  async migrateFromBrowserStorageIfNeeded(): Promise<void> {
    const existing = await db.settings.get(SETTINGS_KEYS.language);
    if (existing) return;

    try {
      const result = await browser.storage.local.get(STORAGE_KEYS.settings);
      const raw = result[STORAGE_KEYS.settings] as
        | {
            language?: unknown;
            theme?: unknown;
            defaultServiceId?: unknown;
            serverBaseUrl?: unknown;
          }
        | undefined;
      if (!raw) {
        await this.save({ ...DEFAULT_SETTINGS });
        return;
      }

      await this.save(
        normalizeSettings({
          language: raw.language as LanguagePreference,
          theme: raw.theme as ThemePreference,
          defaultServiceId:
            typeof raw.defaultServiceId === 'string' ? raw.defaultServiceId : DEFAULT_SERVICE_ID,
        }),
      );
    } catch {
      await this.save({ ...DEFAULT_SETTINGS });
    }
  },
};
