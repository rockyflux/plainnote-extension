import type { SyncStatus } from './local';

/** Note format accepted by PlainNote API. */
export type NoteFormat = 'text' | 'markdown';

/** Public note payload (no secret / edit URL). */
export interface NotePublic {
  id: string;
  title: string | null;
  content: string;
  format: NoteFormat;
  createdAt: number;
  updatedAt: number;
}

/** Full note payload including private edit credential and three URLs. */
export interface NoteFull extends NotePublic {
  secret: string;
  editUrl: string;
  noteUrl: string;
  rawUrl: string;
}

export interface CreateNotePayload {
  title?: string | null;
  content: string;
  format: NoteFormat;
  timezone?: string | null;
  language?: string | null;
}

export interface UpdateNotePayload {
  title?: string | null;
  content?: string;
  format?: NoteFormat;
  /** Custom public share id (6–48, [A-Za-z0-9-]). */
  id?: string;
}

/**
 * Local note index. Bound to the PlainNote service used at creation (`serviceId`).
 * Changing the default service must not rewrite this binding.
 */
export interface LocalNote {
  localId?: number;
  /** Public share id on the server (`id` in API). */
  serverId: string;
  /** Private edit credential — never log, share, or send to content scripts. */
  secret: string;
  /** FK → services.id at creation time. */
  serviceId: string;
  title: string | null;
  content: string;
  format: NoteFormat;
  editUrl: string;
  noteUrl: string;
  rawUrl: string;
  folderId: number | null;
  /** Denormalized tag id list; canonical links live in `noteTags`. */
  tags: number[];
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number | null;
  syncStatus: SyncStatus;
}

/** @deprecated Alias for LocalNote during migration of older call sites. */
export type LocalNoteMeta = LocalNote;
