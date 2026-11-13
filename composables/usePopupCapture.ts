import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import type { LocalNote, NoteFormat, PendingClip, PendingQuickCapture } from '@/types';
import { useToast } from '@/composables/useToast';
import { useSettingsStore } from '@/stores/settings';
import { useNotesStore } from '@/stores/notes';
import { useOrganizationStore } from '@/stores/organization';
import { useServicesStore } from '@/stores/services';
import { draftsService } from '@/services/drafts-service';
import { clipperService } from '@/services/clipper-service';
import { shareService } from '@/services/share-service';
import { apiErrorI18nKey } from '@/utils/api-error';
import { PlainNoteApiError } from '@/types';
import { MAX_CONTENT_LENGTH, MAX_TITLE_LENGTH, STORAGE_KEYS } from '@/utils/constants';
import { isDetachedPopup } from '@/utils/open-popup';
import {
  formatPageLinkNote,
  formatSelectionPlain,
  formatSelectionQuote,
  sanitizeClipText,
  sanitizePageUrl,
} from '@/utils/clip-format';
import { injectPageContext } from '@/utils/page-inject';
import { resolveLocale } from '@/utils/locale';
import { detectNoteFormat, titleFromContent } from '@/utils/note-title';

export type PopupView = 'menu' | 'create' | 'clip' | 'success';

export function usePopupCapture(emit: {
  (e: 'openSidePanel'): void;
  (e: 'openOptions'): void;
  (e: 'openEditor', localId: number): void;
  (e: 'openWorkbench'): void;
  (e: 'detach'): void;
  (e: 'close'): void;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const settingsStore = useSettingsStore();
  const notesStore = useNotesStore();
  const orgStore = useOrganizationStore();
  const servicesStore = useServicesStore();
  const { settings } = storeToRefs(settingsStore);
  const { saving } = storeToRefs(notesStore);
  const { tags } = storeToRefs(orgStore);
  const { items: services } = storeToRefs(servicesStore);

  const view = ref<PopupView>('menu');
  const title = ref('');
  const content = ref('');
  const format = ref<NoteFormat>(settings.value.defaultFormat);
  const serviceId = ref(settings.value.defaultServiceId);
  const folderId = ref<number | null>(settings.value.defaultFolderId);
  const tagIds = ref<number[]>([...settings.value.defaultTagIds]);
  const copyPublicOnSave = ref(false);
  const created = ref<LocalNote | null>(null);
  const busy = ref(false);
  const draftStatus = ref('');
  const ready = ref(false);
  const pageMeta = ref<{ title: string; url: string } | null>(null);
  const showDiscardDialog = ref(false);
  const showTagPicker = ref(false);
  const canDetach = ref(!isDetachedPopup());

  let draftTimer: ReturnType<typeof setTimeout> | undefined;
  let submitting = false;
  let draftPersistChain: Promise<void> = Promise.resolve();

  const charCount = computed(() => [...content.value].length);
  const contentTooLong = computed(() => charCount.value > MAX_CONTENT_LENGTH);
  const canSave = computed(
    () =>
      !!content.value.trim() &&
      !!serviceId.value &&
      !busy.value &&
      !saving.value &&
      !contentTooLong.value,
  );

  /** Auto title: plain text after stripping Markdown/symbols, first 30 chars. */
  function resolveAutoTitle(body: string): string | null {
    const auto = titleFromContent(body, 30).slice(0, MAX_TITLE_LENGTH);
    return auto || null;
  }

  function syncFormatFromContent(body: string) {
    format.value = detectNoteFormat(body);
  }

  const selectedTags = computed(() =>
    tags.value.filter((tg) => tg.id != null && tagIds.value.includes(tg.id)),
  );

  const serviceName = computed(() => {
    const id = created.value?.serviceId ?? serviceId.value;
    return services.value.find((s) => s.id === id)?.name ?? t('workbench.defaultService');
  });

  const badgeKey = computed(() =>
    view.value === 'clip' ? 'popup.badgeClip' : 'popup.badgeQuick',
  );

  const modKey = computed(() => {
    if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform)) {
      return '⌘';
    }
    return 'Ctrl';
  });

  function clipLabels() {
    return {
      source: t('popup.clipSource'),
      excerptTime: t('popup.clipExcerptTime'),
    };
  }

  function applyDefaults() {
    format.value = settings.value.defaultFormat;
    serviceId.value = settings.value.defaultServiceId;
    folderId.value = settings.value.defaultFolderId;
    tagIds.value = [...settings.value.defaultTagIds];
    copyPublicOnSave.value = settings.value.copyPublicLinkOnCreate;
    title.value = '';
    content.value = '';
    pageMeta.value = null;
    draftStatus.value = '';
  }

  function scheduleDraftPersist() {
    if (created.value || view.value === 'menu' || view.value === 'success') return;
    if (!settings.value.autoSaveEnabled) return;
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      draftPersistChain = draftPersistChain.then(() => persistDraft());
    }, settings.value.autoSaveIntervalMs || 450);
  }

  async function persistDraft() {
    try {
      if (!serviceId.value) return;
      if (!title.value.trim() && !content.value.trim()) {
        await draftsService.clearPopupDraft();
        draftStatus.value = '';
        return;
      }
      await draftsService.savePopupDraft({
        serviceId: serviceId.value,
        title: title.value,
        content: content.value,
        format: format.value,
        folderId: folderId.value,
        tagIds: tagIds.value,
      });
      draftStatus.value = t('popup.draftSaved');
    } catch {
      draftStatus.value = t('popup.draftSaveFailed');
    }
  }

  /** Flush draft immediately (before close) — does not rely on Vue unmount. */
  async function flushDraftNow() {
    if (draftTimer) {
      clearTimeout(draftTimer);
      draftTimer = undefined;
    }
    await draftPersistChain;
    if (created.value || view.value === 'menu' || view.value === 'success') return;
    if (!settings.value.autoSaveEnabled) return;
    await persistDraft();
  }

  async function restoreDraft() {
    try {
      const draft = await draftsService.getPopupDraft();
      if (!draft) return false;
      title.value = draft.title;
      content.value = draft.content;
      format.value = draft.format;
      serviceId.value = draft.serviceId || settings.value.defaultServiceId;
      folderId.value = draft.folderId;
      tagIds.value = draft.tagIds ?? [];
      draftStatus.value = t('popup.draftRestored');
      return true;
    } catch {
      toast.show(t('popup.draftRestoreFailed'));
      return false;
    }
  }

  async function loadPageContext(): Promise<{
    title: string;
    url: string;
    selection: string;
  } | null> {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return null;
      const injected = await injectPageContext(tab.id);
      return {
        title: sanitizeClipText(injected?.title || tab.title || ''),
        url: sanitizePageUrl(injected?.url || tab.url || ''),
        selection: sanitizeClipText(injected?.selection || ''),
      };
    } catch {
      return null;
    }
  }

  function applyClipContent(
    selection: string,
    pageTitle: string,
    pageUrl: string,
    asMarkdownQuote: boolean,
  ) {
    const loc = resolveLocale(settings.value.language);
    const opts = {
      labels: clipLabels(),
      excerptAt: Date.now(),
      locale: loc,
    };
    pageMeta.value = { title: pageTitle, url: pageUrl };
    title.value = '';
    format.value = 'markdown';
    if (selection) {
      content.value = asMarkdownQuote
        ? formatSelectionQuote(selection, pageTitle, pageUrl, opts)
        : formatSelectionPlain(selection, pageTitle, pageUrl, opts);
    } else {
      const page = formatPageLinkNote(pageTitle, pageUrl, opts);
      content.value = page.content;
    }
  }

  async function enterCreate(opts?: { fresh?: boolean; content?: string }) {
    if (opts?.fresh) {
      applyDefaults();
      await draftsService.clearPopupDraft();
    } else {
      applyDefaults();
      const restored = await restoreDraft();
      if (!restored) applyDefaults();
    }
    if (opts?.content != null) {
      content.value = opts.content;
      syncFormatFromContent(content.value);
    }
    view.value = 'create';
  }

  async function enterQuickCapture(fromPending: PendingQuickCapture) {
    applyDefaults();
    await draftsService.clearPopupDraft();
    content.value = fromPending.content ?? '';
    syncFormatFromContent(content.value);
    await clipperService.clearPendingQuickCapture();
    view.value = 'create';
  }

  async function enterFromDetach() {
    applyDefaults();
    const restored = await restoreDraft();
    if (!restored) applyDefaults();
    await browser.storage.session.remove(STORAGE_KEYS.pendingDetachOpen);
    view.value = 'create';
  }

  /** Persist current form, then ask host to open a standalone popup window. */
  async function detachToWindow() {
    if (!canDetach.value) return;
    if (draftTimer) {
      clearTimeout(draftTimer);
      draftTimer = undefined;
    }
    await draftPersistChain;
    // Always snapshot before detach — even when auto-save is off.
    if (view.value === 'create' || view.value === 'clip' || view.value === 'menu') {
      if (serviceId.value && (title.value.trim() || content.value.trim())) {
        await draftsService.savePopupDraft({
          serviceId: serviceId.value,
          title: title.value,
          content: content.value,
          format: format.value,
          folderId: folderId.value,
          tagIds: tagIds.value,
        });
      } else if (view.value === 'create' || view.value === 'clip') {
        // Empty create still opens create view in the detached window.
        applyDefaults();
      }
    }
    await browser.storage.session.set({ [STORAGE_KEYS.pendingDetachOpen]: true });
    emit('detach');
  }

  async function enterClip(fromPending?: PendingClip | null) {
    applyDefaults();
    format.value = 'markdown';
    if (fromPending) {
      applyClipContent(
        fromPending.selection,
        fromPending.pageTitle,
        fromPending.pageUrl,
        fromPending.asMarkdownQuote,
      );
      await clipperService.clearPendingClip();
    } else {
      const ctx = await loadPageContext();
      if (!ctx || (!ctx.selection && !ctx.url && !ctx.title)) {
        toast.show(t('errors.noPage'));
        view.value = 'menu';
        return;
      }
      if (!ctx.selection) {
        toast.show(t('errors.noSelection'));
        // Still allow page link mode
        applyClipContent('', ctx.title, ctx.url, true);
      } else {
        applyClipContent(ctx.selection, ctx.title, ctx.url, true);
      }
    }
    view.value = 'clip';
  }

  async function enterSavePage() {
    applyDefaults();
    format.value = 'markdown';
    const ctx = await loadPageContext();
    if (!ctx || (!ctx.title && !ctx.url)) {
      toast.show(t('errors.noPage'));
      return;
    }
    applyClipContent('', ctx.title, ctx.url, true);
    view.value = 'clip';
  }

  function enterMenu() {
    created.value = null;
    view.value = 'menu';
  }

  async function onSave() {
    if (submitting || busy.value || saving.value) return;
    if (!content.value.trim()) {
      toast.show(t('popup.contentRequired'));
      return;
    }
    if (contentTooLong.value) {
      toast.show(t('errors.contentTooLong'));
      return;
    }
    if (!serviceId.value) {
      toast.show(t('services.required'));
      return;
    }

    submitting = true;
    busy.value = true;
    try {
      const autoTitle = resolveAutoTitle(content.value);
      title.value = autoTitle ?? '';
      syncFormatFromContent(content.value);
      const note = await notesStore.create(
        serviceId.value,
        {
          title: autoTitle,
          content: content.value,
          format: format.value,
          language: settings.value.language === 'auto' ? undefined : settings.value.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        {
          folderId: folderId.value,
          tagIds: tagIds.value,
        },
      );
      created.value = note;
      await draftsService.clearPopupDraft();
      draftStatus.value = '';
      title.value = '';
      content.value = '';
      pageMeta.value = null;
      view.value = 'success';
      try {
        await browser.runtime.sendMessage({ type: 'PLAINNOTE_NOTES_CHANGED' });
      } catch {
        // ignore
      }
      if (copyPublicOnSave.value) {
        try {
          await shareService.copyPublicNoteUrl(note);
          toast.show(t('toast.copied'));
        } catch {
          toast.show(t('errors.clipboardFailed'));
        }
      } else {
        toast.show(t('toast.created'));
      }
      if (settings.value.openEditorOnCreate && note.localId != null) {
        emit('openEditor', note.localId);
      }
    } catch (err) {
      await persistDraft();
      if (err instanceof Error && err.message === 'CONTENT_TOO_LONG') {
        toast.show(t('errors.contentTooLong'));
      } else if (err instanceof PlainNoteApiError && err.fields?.content) {
        toast.show(err.fields.content);
      } else {
        toast.show(t(apiErrorI18nKey(err)));
      }
    } finally {
      busy.value = false;
      submitting = false;
    }
  }

  function continueNew() {
    created.value = null;
    applyDefaults();
    view.value = 'create';
  }

  function openCreatedNote() {
    if (created.value) {
      void shareService.openNoteUrl(created.value);
    }
  }

  function openEditor() {
    if (created.value?.localId != null) {
      emit('openEditor', created.value.localId);
    }
  }

  function removeTag(id: number) {
    tagIds.value = tagIds.value.filter((x) => x !== id);
  }

  function onCancel() {
    const dirty = !!content.value.trim();
    if (dirty && (view.value === 'create' || view.value === 'clip')) {
      showDiscardDialog.value = true;
      return;
    }
    emit('close');
  }

  async function keepDraftAndClose() {
    showDiscardDialog.value = false;
    await flushDraftNow();
    emit('close');
  }

  async function discardDraftAndClose() {
    showDiscardDialog.value = false;
    await draftsService.clearPopupDraft();
    emit('close');
  }

  function onKeydown(e: KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;

    // Ctrl/Cmd+Enter → save
    if (e.key === 'Enter' && (view.value === 'create' || view.value === 'clip')) {
      e.preventDefault();
      void onSave();
      return;
    }

    // Ctrl/Cmd+N → new note (avoid browser new window when possible in extension popup)
    if ((e.key === 'n' || e.key === 'N') && !e.shiftKey) {
      e.preventDefault();
      void enterCreate({ fresh: true });
    }
  }

  onMounted(async () => {
    await Promise.all([
      orgStore.ensureDefaults(),
      servicesStore.refresh(),
      settingsStore.ready ? Promise.resolve() : settingsStore.hydrate(),
    ]);
    copyPublicOnSave.value = settings.value.copyPublicLinkOnCreate;

    window.addEventListener('keydown', onKeydown);
    window.addEventListener('pagehide', () => {
      void flushDraftNow();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flushDraftNow();
    });

    try {
      const pendingQuick = await clipperService.getPendingQuickCapture();
      if (pendingQuick) {
        await enterQuickCapture(pendingQuick);
      } else {
        const detachFlag = await browser.storage.session.get(STORAGE_KEYS.pendingDetachOpen);
        if (detachFlag[STORAGE_KEYS.pendingDetachOpen]) {
          await enterFromDetach();
        } else {
          const pending = await clipperService.getPendingClip();
          if (pending) {
            await enterClip(pending);
          } else {
            const hasDraft = await restoreDraft();
            if (hasDraft) {
              view.value = 'create';
            } else {
              applyDefaults();
              view.value = 'menu';
            }
          }
        }
      }
    } catch {
      applyDefaults();
      view.value = 'menu';
      toast.show(t('popup.draftRestoreFailed'));
    } finally {
      ready.value = true;
    }
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown);
    if (draftTimer) clearTimeout(draftTimer);
    void flushDraftNow();
  });

  watch(content, (body) => {
    syncFormatFromContent(body);
  });

  watch(
    [title, content, format, serviceId, folderId, tagIds],
    () => scheduleDraftPersist(),
    { deep: true },
  );

  watch(locale, () => {
    // refresh draft status string language if shown
    if (draftStatus.value) draftStatus.value = t('popup.draftSaved');
  });

  return {
    view,
    title,
    content,
    format,
    serviceId,
    folderId,
    tagIds,
    copyPublicOnSave,
    created,
    busy,
    saving,
    draftStatus,
    ready,
    pageMeta,
    showDiscardDialog,
    showTagPicker,
    charCount,
    canSave,
    selectedTags,
    serviceName,
    badgeKey,
    modKey,
    canDetach,
    enterCreate,
    enterClip,
    enterSavePage,
    enterMenu,
    detachToWindow,
    onSave,
    onCancel,
    continueNew,
    openCreatedNote,
    openEditor,
    removeTag,
    keepDraftAndClose,
    discardDraftAndClose,
    flushDraftNow,
  };
}
