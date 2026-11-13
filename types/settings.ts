import type { NoteFormat } from './note';

/** User language preference. `auto` follows the browser UI language. */
export type LanguagePreference = 'auto' | 'zh-CN' | 'en';

/** Resolved runtime locale used by vue-i18n. */
export type ResolvedLocale = 'zh-CN' | 'en';

/** App chrome theme preference. */
export type ThemePreference = 'light' | 'dark' | 'system';

/** Resolved theme applied to the document. */
export type ResolvedTheme = 'light' | 'dark';

/** Default editor layout for Markdown notes. */
export type EditorViewMode = 'edit' | 'preview' | 'split';

export interface ExtensionSettings {
  language: LanguagePreference;
  theme: ThemePreference;
  /** Default service for *new* notes / drafts only. */
  defaultServiceId: string;
  /** Default format for new notes / quick capture. */
  defaultFormat: NoteFormat;
  /** Default local folder for new notes (`null` = unfiled). */
  defaultFolderId: number | null;
  /** Default local tags applied to new notes. */
  defaultTagIds: number[];
  /** Persist drafts while typing (popup + editor). */
  autoSaveEnabled: boolean;
  /** Debounce interval for local draft autosave (ms). */
  autoSaveIntervalMs: number;
  /**
   * After creating a note, copy the public note URL.
   * Must stay off by default — sharing is an explicit user action.
   */
  copyPublicLinkOnCreate: boolean;
  /** After creating a note (popup), open it in the editor. */
  openEditorOnCreate: boolean;
  /** Default layout when opening a Markdown note. */
  editorViewMode: EditorViewMode;
  /** Keep live Markdown preview when in edit/split (workbench). */
  markdownPreviewDefault: boolean;
  /** Editor body font size in px. */
  editorFontSize: number;
  /** Editor font family CSS value. */
  editorFontFamily: string;
  /** Show CodeMirror line numbers. */
  editorLineNumbers: boolean;
  /** Soft-wrap long lines in the editor. */
  editorWordWrap: boolean;
  /** Show the Markdown toolbar above the editor. */
  editorShowToolbar: boolean;
}

export const DEFAULT_SERVER_BASE_URL = 'https://plainshare-one.vercel.app';

export const DEFAULT_SERVICE_ID = 'svc_plainshare_official';

export const DEFAULT_SERVICE_NAME = 'PlainShare Official';

export const EDITOR_FONT_SIZE_MIN = 12;
export const EDITOR_FONT_SIZE_MAX = 24;
export const EDITOR_FONT_SIZE_DEFAULT = 15;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  language: 'auto',
  theme: 'system',
  defaultServiceId: DEFAULT_SERVICE_ID,
  defaultFormat: 'markdown',
  defaultFolderId: null,
  defaultTagIds: [],
  autoSaveEnabled: true,
  autoSaveIntervalMs: 450,
  copyPublicLinkOnCreate: false,
  openEditorOnCreate: false,
  editorViewMode: 'edit',
  markdownPreviewDefault: false,
  editorFontSize: EDITOR_FONT_SIZE_DEFAULT,
  editorFontFamily: 'var(--font-pn-mono)',
  editorLineNumbers: true,
  editorWordWrap: true,
  editorShowToolbar: true,
};
