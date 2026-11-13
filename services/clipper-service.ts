import type { LocalNote, PendingClip, PendingQuickCapture } from '@/types';
import { noteService } from '@/services/note-service';
import { notesRepository } from '@/repositories/notes-repository';
import { loadSettings } from '@/services/settings-service';
import {
  appendToNoteContent,
  formatPageLinkNote,
  formatSelectionPlain,
  formatSelectionQuote,
  type ClipLabels,
} from '@/utils/clip-format';
import { STORAGE_KEYS } from '@/utils/constants';
import { ensureDatabaseSeeded } from '@/repositories/db';
import { resolveLocale } from '@/utils/locale';

export type ClipCreateMode = 'plain' | 'markdown-quote' | 'page-link';

async function defaultCreateContext() {
  const settings = await loadSettings();
  const locale = resolveLocale(settings.language);
  const labels: ClipLabels =
    locale === 'zh-CN'
      ? { source: '来源', excerptTime: '摘录时间' }
      : { source: 'Source', excerptTime: 'Clipped at' };
  return {
    serviceId: settings.defaultServiceId,
    format: settings.defaultFormat,
    folderId: settings.defaultFolderId,
    tagIds: [...settings.defaultTagIds],
    locale,
    labels,
  };
}

export const clipperService = {
  async createFromSelection(input: {
    selection: string;
    pageTitle: string;
    pageUrl: string;
    mode: 'plain' | 'markdown-quote';
    serviceId?: string;
  }): Promise<LocalNote> {
    await ensureDatabaseSeeded();
    const defaults = await defaultCreateContext();
    const serviceId = input.serviceId ?? defaults.serviceId;
    const clipOpts = {
      labels: defaults.labels,
      excerptAt: Date.now(),
      locale: defaults.locale,
    };
    const content =
      input.mode === 'markdown-quote'
        ? formatSelectionQuote(input.selection, input.pageTitle, input.pageUrl, clipOpts)
        : formatSelectionPlain(input.selection, input.pageTitle, input.pageUrl, clipOpts);

    return noteService.create(
      serviceId,
      {
        title: input.pageTitle || null,
        content,
        format: defaults.format,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        folderId: defaults.folderId,
        tagIds: defaults.tagIds,
      },
    );
  },

  async createFromPageLink(input: {
    pageTitle: string;
    pageUrl: string;
    serviceId?: string;
  }): Promise<LocalNote> {
    await ensureDatabaseSeeded();
    const defaults = await defaultCreateContext();
    const serviceId = input.serviceId ?? defaults.serviceId;
    const { title, content } = formatPageLinkNote(input.pageTitle, input.pageUrl, {
      labels: defaults.labels,
      excerptAt: Date.now(),
      locale: defaults.locale,
    });
    return noteService.create(
      serviceId,
      {
        title,
        content,
        format: defaults.format,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        folderId: defaults.folderId,
        tagIds: defaults.tagIds,
      },
    );
  },

  async appendToNote(localId: number, addition: string): Promise<LocalNote> {
    await ensureDatabaseSeeded();
    const existing = await notesRepository.getByLocalId(localId);
    if (!existing) throw new Error('NOTE_NOT_LOCAL');
    const content = appendToNoteContent(existing.content, addition);
    return noteService.update(existing.serviceId, existing.secret, {
      content,
    });
  },

  async appendSelectionToRecent(input: {
    selection: string;
    pageTitle: string;
    pageUrl: string;
    asMarkdownQuote: boolean;
  }): Promise<LocalNote> {
    await ensureDatabaseSeeded();
    const notes = await notesRepository.list();
    const recent = notes[0];
    if (!recent?.localId) {
      return this.createFromSelection({
        ...input,
        mode: input.asMarkdownQuote ? 'markdown-quote' : 'plain',
      });
    }
    const defaults = await defaultCreateContext();
    const clipOpts = {
      labels: defaults.labels,
      excerptAt: Date.now(),
      locale: defaults.locale,
    };
    const addition = input.asMarkdownQuote
      ? formatSelectionQuote(input.selection, input.pageTitle, input.pageUrl, clipOpts)
      : formatSelectionPlain(input.selection, input.pageTitle, input.pageUrl, clipOpts);
    return this.appendToNote(recent.localId, addition);
  },

  async setPendingClip(clip: PendingClip): Promise<void> {
    await browser.storage.session.set({ [STORAGE_KEYS.pendingClip]: clip });
  },

  async getPendingClip(): Promise<PendingClip | null> {
    const result = await browser.storage.session.get(STORAGE_KEYS.pendingClip);
    const clip = result[STORAGE_KEYS.pendingClip] as PendingClip | undefined;
    return clip ?? null;
  },

  async clearPendingClip(): Promise<void> {
    await browser.storage.session.remove(STORAGE_KEYS.pendingClip);
  },

  async setPendingQuickCapture(capture: PendingQuickCapture): Promise<void> {
    await browser.storage.session.set({ [STORAGE_KEYS.pendingQuickCapture]: capture });
  },

  async getPendingQuickCapture(): Promise<PendingQuickCapture | null> {
    const result = await browser.storage.session.get(STORAGE_KEYS.pendingQuickCapture);
    const capture = result[STORAGE_KEYS.pendingQuickCapture] as PendingQuickCapture | undefined;
    return capture ?? null;
  },

  async clearPendingQuickCapture(): Promise<void> {
    await browser.storage.session.remove(STORAGE_KEYS.pendingQuickCapture);
  },

  async notifyNotesChanged(): Promise<void> {
    try {
      await browser.runtime.sendMessage({ type: 'PLAINNOTE_NOTES_CHANGED' });
    } catch {
      // No listeners (e.g. side panel closed)
    }
  },
};
