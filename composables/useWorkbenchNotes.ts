import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import type { LocalNote, NoteFormat } from '@/types';
import { useToast } from '@/composables/useToast';
import { useNotesStore } from '@/stores/notes';
import { useSettingsStore } from '@/stores/settings';
import { useOrganizationStore } from '@/stores/organization';
import { useServicesStore } from '@/stores/services';
import { useSharesStore } from '@/stores/shares';
import { clipperService } from '@/services/clipper-service';
import { draftsService } from '@/services/drafts-service';
import { apiErrorI18nKey } from '@/utils/api-error';
import { filterNotes, sortNotes, type NoteSortKey } from '@/utils/note-filters';
import type { SideNavKey } from '@/components/notes/SideNav.vue';

export type WorkbenchNavKey = SideNavKey | 'trash';

/**
 * Shared note list / editor orchestration for full-page workbench and slim side panel.
 */
export function useWorkbenchNotes(options?: { enableTabs?: boolean }) {
  const enableTabs = options?.enableTabs ?? false;
  const { t } = useI18n();
  const toast = useToast();
  const notesStore = useNotesStore();
  const settingsStore = useSettingsStore();
  const orgStore = useOrganizationStore();
  const servicesStore = useServicesStore();
  const sharesStore = useSharesStore();
  const { items, loading, saving } = storeToRefs(notesStore);
  const { settings } = storeToRefs(settingsStore);
  const { folders, tags } = storeToRefs(orgStore);

  const nav = ref<WorkbenchNavKey>('all');
  const query = ref('');
  const sort = ref<NoteSortKey>('updatedDesc');
  const activeLocalId = ref<number | null>(null);
  const draftServiceId = ref(settings.value.defaultServiceId);
  const draft = ref<LocalNote | null>(null);
  const openTabIds = ref<number[]>([]);
  const activeFolderId = ref<number | null | undefined>(undefined);
  const activeTagId = ref<number | null>(null);
  const pendingClip = ref(false);

  const { items: shareItems } = storeToRefs(sharesStore);

  const counts = computed(() => {
    const all = items.value;
    return {
      all: all.length,
      favorites: all.filter((n) => n.favorite).length,
      recentEdited: sortNotes(all.slice(), 'updatedDesc').slice(0, 50).length,
      shares: shareItems.value.length,
      trash: 0,
      byFolder: Object.fromEntries(
        folders.value.map((f) => [
          f.id!,
          all.filter((n) => n.folderId === f.id).length,
        ]),
      ) as Record<number, number>,
      byTag: Object.fromEntries(
        tags.value.map((t) => [
          t.id!,
          all.filter((n) => (n.tags ?? []).includes(t.id!)).length,
        ]),
      ) as Record<number, number>,
    };
  });

  const tagNamesById = computed(() => {
    const map = new Map<number, string>();
    for (const tag of tags.value) {
      if (tag.id != null) map.set(tag.id, tag.name);
    }
    return map;
  });

  const filteredNotes = computed(() => {
    const q = { query: query.value, tagNamesById: tagNamesById.value };
    let list = items.value.slice();
    if (nav.value === 'favorites') {
      list = filterNotes(list, { ...q, favoriteOnly: true });
    } else if (nav.value === 'recentOpened') {
      list = filterNotes(list, { ...q, openedOnly: true });
      return sortNotes(list, 'openedDesc');
    } else if (nav.value === 'recentEdited') {
      list = filterNotes(list, q);
      return sortNotes(list, 'updatedDesc').slice(0, 50);
    } else if (nav.value === 'trash') {
      return [];
    } else if (nav.value === 'folders' && activeFolderId.value !== undefined) {
      list = filterNotes(list, {
        ...q,
        folderId: activeFolderId.value === undefined ? undefined : activeFolderId.value,
      });
    } else if (nav.value === 'tags' && activeTagId.value != null) {
      list = filterNotes(list, { ...q, tagId: activeTagId.value });
    } else if (nav.value === 'shares') {
      return [];
    } else {
      list = filterNotes(list, q);
    }
    return sortNotes(list, sort.value);
  });

  const openTabs = computed(() =>
    openTabIds.value
      .map((id) => items.value.find((n) => n.localId === id))
      .filter((n): n is LocalNote => !!n && n.localId != null),
  );

  async function refreshAll() {
    await Promise.all([
      notesStore.refresh(),
      orgStore.refresh(),
      servicesStore.refresh(),
      sharesStore.refresh(),
    ]);
  }

  async function checkPendingClip() {
    const pending = await clipperService.getPendingClip();
    pendingClip.value = !!pending;
  }

  async function checkFocusNote() {
    const result = await browser.storage.session.get('plainnote.focusNoteId');
    const localId = result['plainnote.focusNoteId'] as number | undefined;
    if (localId != null) {
      await browser.storage.session.remove('plainnote.focusNoteId');
      await refreshAll();
      openNote(localId);
    }
  }

  function onRuntimeMessage(message: { type?: string; localId?: number }) {
    if (message?.type === 'PLAINNOTE_NOTES_CHANGED') void refreshAll();
    if (message?.type === 'PLAINNOTE_FOCUS_NOTE' && message.localId != null) {
      void refreshAll().then(() => openNote(message.localId!));
    }
  }

  function onVisible() {
    if (document.visibilityState === 'visible') {
      void refreshAll().then(checkPendingClip);
    }
  }

  onMounted(() => {
    void orgStore.ensureDefaults().then(refreshAll).then(async () => {
      await checkPendingClip();
      await checkFocusNote();
    });
    browser.runtime.onMessage.addListener(onRuntimeMessage);
    document.addEventListener('visibilitychange', onVisible);
  });

  onUnmounted(() => {
    browser.runtime.onMessage.removeListener(onRuntimeMessage);
    document.removeEventListener('visibilitychange', onVisible);
  });

  watch(
    () => settings.value.defaultServiceId,
    (id) => {
      draftServiceId.value = id;
    },
  );

  watch(nav, () => {
    query.value = '';
    if (nav.value !== 'folders') activeFolderId.value = undefined;
    if (nav.value !== 'tags') activeTagId.value = null;
    if (nav.value === 'recentEdited' || nav.value === 'recentOpened') {
      sort.value = nav.value === 'recentOpened' ? 'openedDesc' : 'updatedDesc';
    }
  });

  async function openNote(localId: number) {
    const note = items.value.find((n) => n.localId === localId);
    if (!note) return;
    activeLocalId.value = localId;
    draft.value = { ...note, tags: [...(note.tags ?? [])] };
    if (enableTabs && !openTabIds.value.includes(localId)) {
      openTabIds.value = [...openTabIds.value, localId];
    }
    await notesStore.touchOpened(localId);
  }

  function closeTab(localId: number) {
    openTabIds.value = openTabIds.value.filter((id) => id !== localId);
    if (activeLocalId.value === localId) {
      const next = openTabIds.value[openTabIds.value.length - 1];
      if (next != null) void openNote(next);
      else {
        activeLocalId.value = null;
        draft.value = null;
      }
    }
  }

  async function createNote() {
    const serviceId =
      draftServiceId.value ||
      settings.value.defaultServiceId ||
      '';
    if (!serviceId) {
      toast.show(t('services.required'));
      return null;
    }
    try {
      const note = await notesStore.create(
        serviceId,
        {
          content: t('sidePanel.newNotePlaceholder'),
          format: settings.value.defaultFormat,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: settings.value.language === 'auto' ? undefined : settings.value.language,
        },
        {
          folderId: settings.value.defaultFolderId,
          tagIds: [...settings.value.defaultTagIds],
        },
      );
      try {
        await browser.runtime.sendMessage({ type: 'PLAINNOTE_NOTES_CHANGED' });
      } catch {
        // ignore
      }
      if (note.localId != null) await openNote(note.localId);
      toast.show(t('toast.created'));
      return note;
    } catch (err) {
      toast.show(t(apiErrorI18nKey(err)));
      return null;
    }
  }

  function updateTitle(value: string) {
    if (!draft.value) return;
    draft.value = { ...draft.value, title: value || null };
  }

  function updateContent(value: string) {
    if (!draft.value) return;
    draft.value = { ...draft.value, content: value };
  }

  function updateFormat(value: NoteFormat) {
    if (!draft.value) return;
    draft.value = { ...draft.value, format: value };
  }

  async function updateFolderId(value: number | null) {
    const note = draft.value;
    if (!note || typeof note.localId !== 'number') return;
    draft.value = { ...note, folderId: value };
    await notesStore.setFolder(note.localId, value);
  }

  async function updateTagIds(value: number[]) {
    const note = draft.value;
    if (!note || typeof note.localId !== 'number') return;
    draft.value = { ...note, tags: value };
    await notesStore.setTags(note.localId, value);
  }

  async function saveRemote(markRemoteSynced?: (n: LocalNote) => Promise<void>) {
    if (!draft.value?.localId) return;
    try {
      const updated = await notesStore.updateByLocalId(draft.value.localId, {
        title: draft.value.title,
        content: draft.value.content,
        format: draft.value.format,
      });
      draft.value = { ...updated, tags: [...(updated.tags ?? [])] };
      await markRemoteSynced?.(updated);
      await draftsService.clearEditorDraft(updated.localId!);
      try {
        await browser.runtime.sendMessage({ type: 'PLAINNOTE_NOTES_CHANGED' });
      } catch {
        // ignore
      }
      toast.show(t('toast.updated'));
    } catch (err) {
      toast.show(t(apiErrorI18nKey(err)));
    }
  }

  async function toggleFavoriteFromEditor() {
    if (!draft.value?.localId) return;
    const next = !draft.value.favorite;
    await notesStore.setFavorite(draft.value.localId, next);
    draft.value = { ...draft.value, favorite: next };
  }

  async function toggleFavoriteFromList(localId: number) {
    const note = items.value.find((n) => n.localId === localId);
    if (!note) return;
    await notesStore.setFavorite(localId, !note.favorite);
  }

  async function deleteLocal() {
    if (draft.value?.localId == null) return;
    const id = draft.value.localId;
    try {
      await draftsService.clearEditorDraft(id);
      await notesStore.removeLocalIndexOnly(id);
      if (enableTabs) closeTab(id);
      else {
        draft.value = null;
        activeLocalId.value = null;
      }
      toast.show(t('toast.deletedLocal'));
    } catch (err) {
      toast.show(t(apiErrorI18nKey(err)));
    }
  }

  async function deleteRemote() {
    if (draft.value?.localId == null) return;
    const id = draft.value.localId;
    try {
      await draftsService.clearEditorDraft(id);
      await notesStore.removeRemoteAndLocal(id);
      if (enableTabs) closeTab(id);
      else {
        draft.value = null;
        activeLocalId.value = null;
      }
      toast.show(t('toast.deleted'));
    } catch (err) {
      toast.show(t(apiErrorI18nKey(err)));
    }
  }

  function selectFolder(folderId: number | null) {
    nav.value = 'folders';
    activeFolderId.value = folderId;
  }

  function selectTag(tagId: number) {
    nav.value = 'tags';
    activeTagId.value = tagId;
  }

  function clearPendingClip() {
    pendingClip.value = false;
  }

  return {
    t,
    toast,
    items,
    loading,
    saving,
    settings,
    folders,
    tags,
    nav,
    query,
    sort,
    activeLocalId,
    draftServiceId,
    draft,
    openTabIds,
    openTabs,
    activeFolderId,
    activeTagId,
    pendingClip,
    counts,
    filteredNotes,
    refreshAll,
    openNote,
    closeTab,
    createNote,
    updateTitle,
    updateContent,
    updateFormat,
    updateFolderId,
    updateTagIds,
    saveRemote,
    toggleFavoriteFromEditor,
    toggleFavoriteFromList,
    deleteLocal,
    deleteRemote,
    selectFolder,
    selectTag,
    clearPendingClip,
    checkPendingClip,
  };
}
