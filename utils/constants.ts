import {
  DEFAULT_SERVER_BASE_URL,
  DEFAULT_SERVICE_ID,
  DEFAULT_SERVICE_NAME,
} from '@/types';

export { DEFAULT_SERVER_BASE_URL, DEFAULT_SERVICE_ID, DEFAULT_SERVICE_NAME };

/** Mirrors PlainNote server limits (do not invent stricter/looser client rules casually). */
export const MAX_CONTENT_LENGTH = 30_000;
export const MAX_TITLE_LENGTH = 200;
export const MIN_SHARE_ID_LENGTH = 6;
export const MAX_SHARE_ID_LENGTH = 48;
export const SHARE_ID_PATTERN = /^[A-Za-z0-9-]+$/;

/** Probe path that should return JSON 404 from a healthy PlainNote API. */
export const SERVICE_HEALTH_SECRET = '__plainnote_ext_health__';

export const SETTINGS_KEYS = {
  language: 'language',
  theme: 'theme',
  defaultServiceId: 'defaultServiceId',
  defaultFormat: 'defaultFormat',
  defaultFolderId: 'defaultFolderId',
  defaultTagIds: 'defaultTagIds',
  autoSaveEnabled: 'autoSaveEnabled',
  autoSaveIntervalMs: 'autoSaveIntervalMs',
  copyPublicLinkOnCreate: 'copyPublicLinkOnCreate',
  openEditorOnCreate: 'openEditorOnCreate',
  editorViewMode: 'editorViewMode',
  markdownPreviewDefault: 'markdownPreviewDefault',
  editorFontSize: 'editorFontSize',
  editorFontFamily: 'editorFontFamily',
  editorLineNumbers: 'editorLineNumbers',
  editorWordWrap: 'editorWordWrap',
  editorShowToolbar: 'editorShowToolbar',
} as const;

/** Legacy browser.storage key (migrated into Dexie settings). */
export const STORAGE_KEYS = {
  settings: 'plainnote.settings',
  pendingClip: 'plainnote.pendingClip',
  pendingQuickCapture: 'plainnote.pendingQuickCapture',
  /** Open Popup 快速记录 in create view after detaching to a window. */
  pendingDetachOpen: 'plainnote.pendingDetachOpen',
  lastToastAt: 'plainnote.lastToastAt',
  focusNoteId: 'plainnote.focusNoteId',
  focusPanel: 'plainnote.focusPanel',
} as const;

/** Manifest command ids — must match wxt.config.ts `commands`. */
export const COMMAND_IDS = {
  quickCreate: 'quick-create',
  saveSelection: 'save-selection',
  openSidePanel: 'open-side-panel',
} as const;

export const AUTO_SAVE_INTERVAL_MIN_MS = 200;
export const AUTO_SAVE_INTERVAL_MAX_MS = 5000;
export const AUTO_SAVE_INTERVAL_DEFAULT_MS = 450;
