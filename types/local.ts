import type { NoteFormat } from './note';

export type SyncStatus = 'synced' | 'pending' | 'local-only' | 'error' | 'deleted-remote';

export interface LocalFolder {
  id?: number;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface LocalTag {
  id?: number;
  name: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

/** Join table: note ↔ tag (many-to-many). */
export interface NoteTagLink {
  id?: number;
  noteLocalId: number;
  tagId: number;
  createdAt: number;
}

/**
 * Share / copy history. Never stores `secret` or Edit URL.
 * Public channels may store noteUrl / rawUrl only.
 */
export type ShareChannel = 'copy-note-url' | 'copy-raw-url' | 'copy-edit-url' | 'other';

export interface ShareRecord {
  id?: number;
  noteLocalId: number | null;
  /** Public share id only — never the edit secret. */
  serverId: string | null;
  serviceId: string | null;
  /** Public URL only; null when channel is private edit copy. */
  sharedUrl: string | null;
  title: string | null;
  channel: ShareChannel;
  sharedAt: number;
}

export interface DraftRecord {
  id?: number;
  /** Target service for when the draft is published. */
  serviceId: string;
  title: string;
  content: string;
  format: NoteFormat;
  folderId: number | null;
  tagIds: number[];
  /** Distinguishes Popup autosave vs per-note editor drafts. */
  kind?: 'popup' | 'editor' | 'general';
  /** When kind=editor, the local note this draft belongs to. */
  noteLocalId?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface SettingsRow {
  key: string;
  value: unknown;
  updatedAt: number;
}

/** @deprecated Use ShareRecord — kept for migration typing only. */
export interface ShareHistoryItem {
  id?: number;
  secret: string;
  publicId: string;
  serverBaseUrl: string;
  noteUrl: string;
  rawUrl: string;
  title: string | null;
  sharedAt: number;
  channel: ShareChannel;
}
