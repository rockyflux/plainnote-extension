import type {
  BackupImportMode,
  BackupImportResult,
  DraftRecord,
  ExtensionSettings,
  LocalFolder,
  LocalNote,
  LocalTag,
  NoteTagLink,
  PlainNoteBackup,
  ServiceRecord,
  ShareRecord,
} from '@/types';
import { BACKUP_FORMAT_VERSION } from '@/types/backup';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { db, ensureDatabaseSeeded } from '@/repositories/db';
import { settingsRepository } from '@/repositories/settings-repository';
import { normalizeServerBaseUrl } from '@/utils/url';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function parseBackupJson(raw: string): PlainNoteBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('BACKUP_INVALID_JSON');
  }
  if (!isObject(parsed)) throw new Error('BACKUP_INVALID_SHAPE');
  if (parsed.format !== 'plainnote-extension-backup') throw new Error('BACKUP_INVALID_FORMAT');
  if (parsed.version !== BACKUP_FORMAT_VERSION) throw new Error('BACKUP_UNSUPPORTED_VERSION');

  const settingsRaw = isObject(parsed.settings) ? parsed.settings : {};
  const settings: ExtensionSettings = {
    ...DEFAULT_SETTINGS,
    ...(settingsRaw as Partial<ExtensionSettings>),
    defaultTagIds: Array.isArray(settingsRaw.defaultTagIds)
      ? (settingsRaw.defaultTagIds as number[])
      : DEFAULT_SETTINGS.defaultTagIds,
  };

  return {
    format: 'plainnote-extension-backup',
    version: BACKUP_FORMAT_VERSION,
    exportedAt: typeof parsed.exportedAt === 'number' ? parsed.exportedAt : Date.now(),
    includesSecrets: Boolean(parsed.includesSecrets),
    settings,
    services: asArray<ServiceRecord>(parsed.services),
    folders: asArray<LocalFolder>(parsed.folders),
    tags: asArray<LocalTag>(parsed.tags),
    noteTags: asArray<NoteTagLink>(parsed.noteTags),
    notes: asArray<LocalNote>(parsed.notes),
    drafts: asArray<DraftRecord>(parsed.drafts),
    shareRecords: asArray<ShareRecord>(parsed.shareRecords),
  };
}

export const backupService = {
  async exportAll(): Promise<PlainNoteBackup> {
    await ensureDatabaseSeeded();
    const [settings, services, folders, tags, noteTags, notes, drafts, shareRecords] =
      await Promise.all([
        settingsRepository.getAll(),
        db.services.toArray(),
        db.folders.toArray(),
        db.tags.toArray(),
        db.noteTags.toArray(),
        db.notes.toArray(),
        db.drafts.toArray(),
        db.shareRecords.toArray(),
      ]);

    return {
      format: 'plainnote-extension-backup',
      version: BACKUP_FORMAT_VERSION,
      exportedAt: Date.now(),
      includesSecrets: notes.some((n) => Boolean(n.secret)),
      settings,
      services,
      folders,
      tags,
      noteTags,
      notes,
      drafts,
      shareRecords,
    };
  },

  async exportJson(pretty = true): Promise<string> {
    const backup = await this.exportAll();
    return pretty ? JSON.stringify(backup, null, 2) : JSON.stringify(backup);
  },

  /**
   * Restore multi-service library.
   * Notes whose serviceId is missing from both backup services and existing DB are skipped
   * (never attach a secret to the wrong origin).
   */
  async importBackup(
    backup: PlainNoteBackup,
    mode: BackupImportMode = 'merge',
  ): Promise<BackupImportResult> {
    await ensureDatabaseSeeded();
    const warnings: string[] = [];
    let skippedNotes = 0;

    const serviceById = new Map<string, ServiceRecord>();
    for (const svc of backup.services) {
      if (!svc?.id || !svc.baseUrl) {
        warnings.push('SERVICE_SKIPPED_INVALID');
        continue;
      }
      try {
        serviceById.set(svc.id, {
          ...svc,
          baseUrl: normalizeServerBaseUrl(svc.baseUrl),
        });
      } catch {
        warnings.push(`SERVICE_SKIPPED_BAD_URL:${svc.id}`);
      }
    }

    await db.transaction(
      'rw',
      [
        db.services,
        db.folders,
        db.tags,
        db.noteTags,
        db.notes,
        db.drafts,
        db.shareRecords,
        db.settings,
      ],
      async () => {
        if (mode === 'replace') {
          await Promise.all([
            db.noteTags.clear(),
            db.notes.clear(),
            db.drafts.clear(),
            db.shareRecords.clear(),
            db.folders.clear(),
            db.tags.clear(),
            // Keep official service row if present; clear others then re-seed from backup.
            db.services.clear(),
          ]);
        }

        for (const svc of serviceById.values()) {
          const existing = await db.services.get(svc.id);
          if (existing) {
            // Never silently rebind an existing service id to a different origin.
            if (existing.baseUrl !== svc.baseUrl) {
              warnings.push(`SERVICE_URL_MISMATCH:${svc.id}`);
              continue;
            }
            await db.services.put({
              ...existing,
              ...svc,
              baseUrl: existing.baseUrl,
              updatedAt: Date.now(),
            });
          } else {
            await db.services.put({
              ...svc,
              updatedAt: Date.now(),
            });
          }
        }

        // Ensure at least one default.
        const allServices = await db.services.toArray();
        if (allServices.length && !allServices.some((s) => s.isDefault)) {
          await db.services.update(allServices[0]!.id, { isDefault: true });
        }

        const folderIdMap = new Map<number, number>();
        for (const folder of backup.folders) {
          const { id: _oldId, ...rest } = folder;
          const newId = (await db.folders.add({
            ...rest,
            updatedAt: Date.now(),
          })) as number;
          if (folder.id != null) folderIdMap.set(folder.id, newId);
        }

        const tagIdMap = new Map<number, number>();
        for (const tag of backup.tags) {
          const { id: _oldId, ...rest } = tag;
          const newId = (await db.tags.add({
            ...rest,
            updatedAt: Date.now(),
          })) as number;
          if (tag.id != null) tagIdMap.set(tag.id, newId);
        }

        const existingServices = await db.services.toArray();
        const knownServiceIds = new Set(existingServices.map((s) => s.id));

        const noteIdMap = new Map<number, number>();
        for (const note of backup.notes) {
          if (!note.secret || !note.serviceId || !note.serverId) {
            skippedNotes += 1;
            warnings.push('NOTE_SKIPPED_INCOMPLETE');
            continue;
          }
          if (!knownServiceIds.has(note.serviceId)) {
            skippedNotes += 1;
            warnings.push(`NOTE_SKIPPED_UNKNOWN_SERVICE:${note.serviceId}`);
            continue;
          }

          // Guard: secret must stay with its bound service — never remap to another origin.
          const bound = existingServices.find((s) => s.id === note.serviceId);
          const backupSvc = serviceById.get(note.serviceId);
          if (bound && backupSvc && bound.baseUrl !== backupSvc.baseUrl) {
            skippedNotes += 1;
            warnings.push(`NOTE_SKIPPED_SERVICE_MISMATCH:${note.serverId}`);
            continue;
          }

          const mappedFolder =
            note.folderId != null ? (folderIdMap.get(note.folderId) ?? null) : null;
          const mappedTags = (note.tags ?? [])
            .map((tid: number) => tagIdMap.get(tid))
            .filter((tid: number | undefined): tid is number => tid != null);

          const { localId: _oldLocalId, ...rest } = note;
          const newLocalId = (await db.notes.add({
            ...rest,
            folderId: mappedFolder,
            tags: mappedTags,
            syncStatus: note.syncStatus ?? 'synced',
          })) as number;

          if (note.localId != null) noteIdMap.set(note.localId, newLocalId);

          if (mappedTags.length) {
            const now = Date.now();
            await db.noteTags.bulkAdd(
              mappedTags.map((tagId: number) => ({
                noteLocalId: newLocalId,
                tagId,
                createdAt: now,
              })),
            );
          }
        }

        for (const draft of backup.drafts) {
          const { id: _id, ...rest } = draft;
          const mappedNoteLocalId =
            draft.noteLocalId != null
              ? (noteIdMap.get(draft.noteLocalId) ?? null)
              : (draft.noteLocalId ?? null);
          const mappedFolder =
            draft.folderId != null ? (folderIdMap.get(draft.folderId) ?? null) : null;
          const mappedTags = (draft.tagIds ?? [])
            .map((tid) => tagIdMap.get(tid))
            .filter((tid): tid is number => tid != null);
          if (rest.serviceId && !knownServiceIds.has(rest.serviceId)) {
            warnings.push(`DRAFT_SKIPPED_UNKNOWN_SERVICE:${rest.serviceId}`);
            continue;
          }
          await db.drafts.add({
            ...rest,
            noteLocalId: mappedNoteLocalId,
            folderId: mappedFolder,
            tagIds: mappedTags,
            updatedAt: Date.now(),
          });
        }

        for (const record of backup.shareRecords) {
          const { id: _id, ...rest } = record;
          const mappedNoteLocalId =
            record.noteLocalId != null
              ? (noteIdMap.get(record.noteLocalId) ?? null)
              : null;
          await db.shareRecords.add({
            ...rest,
            noteLocalId: mappedNoteLocalId,
          });
        }

        const mappedDefaultFolder =
          backup.settings.defaultFolderId != null
            ? (folderIdMap.get(backup.settings.defaultFolderId) ?? null)
            : null;
        const mappedDefaultTags = (backup.settings.defaultTagIds ?? [])
          .map((tid) => tagIdMap.get(tid))
          .filter((tid): tid is number => tid != null);

        const defaultServiceId = knownServiceIds.has(backup.settings.defaultServiceId)
          ? backup.settings.defaultServiceId
          : (existingServices.find((s) => s.isDefault)?.id ??
            existingServices[0]?.id ??
            DEFAULT_SETTINGS.defaultServiceId);

        await settingsRepository.save({
          ...DEFAULT_SETTINGS,
          ...backup.settings,
          defaultServiceId,
          defaultFolderId: mappedDefaultFolder,
          defaultTagIds: mappedDefaultTags,
        });
      },
    );

    return {
      services: serviceById.size,
      folders: backup.folders.length,
      tags: backup.tags.length,
      notes: backup.notes.length - skippedNotes,
      drafts: backup.drafts.length,
      shareRecords: backup.shareRecords.length,
      skippedNotes,
      warnings,
    };
  },

  async clearLocalData(scope: 'all' | 'drafts' | 'shares' | 'notes-org'): Promise<void> {
    await ensureDatabaseSeeded();
    if (scope === 'drafts') {
      await db.drafts.clear();
      return;
    }
    if (scope === 'shares') {
      await db.shareRecords.clear();
      return;
    }
    if (scope === 'notes-org') {
      await db.transaction('rw', [db.notes, db.noteTags, db.folders, db.tags, db.drafts], async () => {
        await db.noteTags.clear();
        await db.notes.clear();
        await db.drafts.clear();
        await db.folders.clear();
        await db.tags.clear();
      });
      return;
    }

    await db.transaction(
      'rw',
      [
        db.notes,
        db.noteTags,
        db.folders,
        db.tags,
        db.drafts,
        db.shareRecords,
        db.services,
        db.settings,
      ],
      async () => {
        await db.noteTags.clear();
        await db.notes.clear();
        await db.drafts.clear();
        await db.shareRecords.clear();
        await db.folders.clear();
        await db.tags.clear();
        await db.services.clear();
        await db.settings.clear();
      },
    );
    // Re-seed official service + defaults.
    await ensureDatabaseSeeded();
    await settingsRepository.save({ ...DEFAULT_SETTINGS });
  },
};
