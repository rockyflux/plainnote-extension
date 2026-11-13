import type { ExtensionSettings } from './settings';
import type { LocalFolder, LocalTag, NoteTagLink, ShareRecord, DraftRecord } from './local';
import type { LocalNote } from './note';
import type { ServiceRecord } from './service';

export const BACKUP_FORMAT_VERSION = 1 as const;

/**
 * Portable local library snapshot.
 * Notes may include `secret` — treat as sensitive credentials.
 */
export interface PlainNoteBackup {
  format: 'plainnote-extension-backup';
  version: typeof BACKUP_FORMAT_VERSION;
  exportedAt: number;
  includesSecrets: boolean;
  settings: ExtensionSettings;
  services: ServiceRecord[];
  folders: LocalFolder[];
  tags: LocalTag[];
  noteTags: NoteTagLink[];
  notes: LocalNote[];
  drafts: DraftRecord[];
  shareRecords: ShareRecord[];
}

export type BackupImportMode = 'merge' | 'replace';

export interface BackupImportResult {
  services: number;
  folders: number;
  tags: number;
  notes: number;
  drafts: number;
  shareRecords: number;
  skippedNotes: number;
  warnings: string[];
}
