import type { LocalNote, ShareChannel } from '@/types';
import { shareRecordsRepository } from '@/repositories/share-records-repository';
import { ensureDatabaseSeeded } from '@/repositories/db';
import { isEditUrl } from '@/utils/share-links';
import { secureInfo } from '@/utils/secure-log';

export type ShareAction = 'copy-note-url' | 'copy-raw-url' | 'copy-edit-url' | 'open-note-url';

/**
 * Central share actions. Records only intentional user copies/opens.
 * Never writes secret or Edit URL into IndexedDB history.
 */
export const shareService = {
  async copyPublicNoteUrl(note: LocalNote): Promise<void> {
    await navigator.clipboard.writeText(note.noteUrl);
    await this.record(note, 'copy-note-url', note.noteUrl);
  },

  async copyRawUrl(note: LocalNote): Promise<void> {
    await navigator.clipboard.writeText(note.rawUrl);
    await this.record(note, 'copy-raw-url', note.rawUrl);
  },

  /**
   * Caller must show the private-credential warning dialog first.
   */
  async copyEditUrlAfterConfirm(note: LocalNote): Promise<void> {
    if (!isEditUrl(note.editUrl)) {
      throw new Error('INVALID_EDIT_URL');
    }
    await navigator.clipboard.writeText(note.editUrl);
    await this.record(note, 'copy-edit-url', null);
    secureInfo('share.copy-edit-url', {
      serverId: note.serverId,
      serviceId: note.serviceId,
      // secret intentionally omitted
    });
  },

  async openNoteUrl(note: LocalNote): Promise<void> {
    window.open(note.noteUrl, '_blank', 'noopener,noreferrer');
    await this.record(note, 'other', note.noteUrl);
  },

  async openRawUrl(note: LocalNote): Promise<void> {
    window.open(note.rawUrl, '_blank', 'noopener,noreferrer');
    await this.record(note, 'other', note.rawUrl);
  },

  /** Caller should warn the user — Edit URL is a private credential. */
  async openEditUrlAfterConfirm(note: LocalNote): Promise<void> {
    if (!isEditUrl(note.editUrl)) {
      throw new Error('INVALID_EDIT_URL');
    }
    window.open(note.editUrl, '_blank', 'noopener,noreferrer');
    await this.record(note, 'other', null);
    secureInfo('share.open-edit-url', {
      serverId: note.serverId,
      serviceId: note.serviceId,
    });
  },

  async record(
    note: Pick<LocalNote, 'localId' | 'serverId' | 'serviceId' | 'title'>,
    channel: ShareChannel,
    sharedUrl: string | null,
  ): Promise<void> {
    await ensureDatabaseSeeded();
    await shareRecordsRepository.add({
      noteLocalId: note.localId ?? null,
      serverId: note.serverId,
      serviceId: note.serviceId,
      sharedUrl: channel === 'copy-edit-url' ? null : sharedUrl,
      title: note.title,
      channel,
      sharedAt: Date.now(),
    });
  },
};
