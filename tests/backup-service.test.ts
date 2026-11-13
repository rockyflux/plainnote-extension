import { describe, expect, it } from 'vitest';
import { parseBackupJson } from '@/services/backup-service';
import { DEFAULT_SETTINGS } from '@/types';
import { BACKUP_FORMAT_VERSION } from '@/types/backup';

function minimalBackup(overrides: Record<string, unknown> = {}) {
  return {
    format: 'plainnote-extension-backup',
    version: BACKUP_FORMAT_VERSION,
    exportedAt: 1,
    includesSecrets: true,
    settings: { ...DEFAULT_SETTINGS },
    services: [],
    folders: [],
    tags: [],
    noteTags: [],
    notes: [],
    drafts: [],
    shareRecords: [],
    ...overrides,
  };
}

describe('parseBackupJson', () => {
  it('rejects invalid JSON / format / version', () => {
    expect(() => parseBackupJson('{')).toThrow('BACKUP_INVALID_JSON');
    expect(() => parseBackupJson(JSON.stringify({ format: 'other', version: 1 }))).toThrow(
      'BACKUP_INVALID_FORMAT',
    );
    expect(() =>
      parseBackupJson(JSON.stringify({ format: 'plainnote-extension-backup', version: 99 })),
    ).toThrow('BACKUP_UNSUPPORTED_VERSION');
  });

  it('parses a valid backup and fills settings defaults', () => {
    const parsed = parseBackupJson(
      JSON.stringify(
        minimalBackup({
          includesSecrets: true,
          notes: [
            {
              serverId: 'abc',
              secret: 's',
              serviceId: 'svc_a',
              content: 'x',
              format: 'markdown',
            },
          ],
          settings: { language: 'en', defaultServiceId: 'svc_a' },
        }),
      ),
    );

    expect(parsed.format).toBe('plainnote-extension-backup');
    expect(parsed.version).toBe(1);
    expect(parsed.includesSecrets).toBe(true);
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.settings.defaultFormat).toBe('markdown');
    expect(parsed.settings.autoSaveEnabled).toBe(true);
    expect(parsed.settings.language).toBe('en');
    expect(parsed.settings.defaultServiceId).toBe('svc_a');
  });

  it('marks multi-service payload shape for restore consumers', () => {
    const parsed = parseBackupJson(
      JSON.stringify(
        minimalBackup({
          services: [
            {
              id: 'svc_a',
              name: 'A',
              baseUrl: 'https://a.example.com',
              isDefault: true,
            },
            {
              id: 'svc_b',
              name: 'B',
              baseUrl: 'http://127.0.0.1:3123',
              isDefault: false,
            },
          ],
          folders: [{ id: 1, name: 'Work' }],
          tags: [{ id: 2, name: 'tag' }],
          notes: [
            { serverId: 'n1', secret: 'sa', serviceId: 'svc_a', content: '1', format: 'text' },
            { serverId: 'n2', secret: 'sb', serviceId: 'svc_b', content: '2', format: 'markdown' },
          ],
        }),
      ),
    );

    expect(parsed.services).toHaveLength(2);
    expect(parsed.folders).toHaveLength(1);
    expect(parsed.tags).toHaveLength(1);
    expect(new Set(parsed.notes.map((n) => n.serviceId)).size).toBe(2);
  });
});
