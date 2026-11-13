import type { ShareRecord } from '@/types';
import { db } from '@/repositories/db';
import { assertShareRecordUrlSafe } from '@/utils/share-links';

export const shareRecordsRepository = {
  list(limit = 200): Promise<ShareRecord[]> {
    return db.shareRecords.orderBy('sharedAt').reverse().limit(limit).toArray();
  },

  async get(id: number): Promise<ShareRecord | undefined> {
    return db.shareRecords.get(id);
  },

  /**
   * Persist a share action. Callers must never pass `secret` or Edit URL.
   * For `copy-edit-url`, `sharedUrl` must be null.
   * Deleting records never touches remote notes.
   */
  async add(item: Omit<ShareRecord, 'id'>): Promise<number> {
    assertShareRecordUrlSafe(item.channel, item.sharedUrl);
    // Strip accidental secret-like fields if a caller spreads a LocalNote
    const safe: Omit<ShareRecord, 'id'> = {
      noteLocalId: item.noteLocalId,
      serverId: item.serverId,
      serviceId: item.serviceId,
      sharedUrl: item.channel === 'copy-edit-url' ? null : item.sharedUrl,
      title: item.title,
      channel: item.channel,
      sharedAt: item.sharedAt,
    };
    return (await db.shareRecords.add(safe)) as number;
  },

  async remove(id: number): Promise<void> {
    await db.shareRecords.delete(id);
  },

  async clear(): Promise<void> {
    await db.shareRecords.clear();
  },
};

/** @deprecated Prefer shareRecordsRepository */
export const shareHistoryRepository = {
  list: (limit = 50) => shareRecordsRepository.list(limit),
  async add(): Promise<number> {
    throw new Error('shareHistoryRepository.add is retired — use shareRecordsRepository');
  },
  clear: () => shareRecordsRepository.clear(),
};
