<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { LocalNote } from '@/types';
import AppToast from '@/components/AppToast.vue';
import ClipAppendPicker from '@/components/clip/ClipAppendPicker.vue';
import ShareRecordsPanel from '@/components/notes/ShareRecordsPanel.vue';
import WorkbenchSidebar from '@/components/workbench/WorkbenchSidebar.vue';
import WorkbenchTopBar from '@/components/workbench/WorkbenchTopBar.vue';
import WorkbenchTabs from '@/components/workbench/WorkbenchTabs.vue';
import WorkbenchNoteList from '@/components/workbench/WorkbenchNoteList.vue';
import WorkbenchEditor from '@/components/workbench/WorkbenchEditor.vue';
import WorkbenchIcon from '@/components/workbench/WorkbenchIcon.vue';
import { useWorkbenchNotes } from '@/composables/useWorkbenchNotes';
import { useToast } from '@/composables/useToast';
import { useOrganizationStore } from '@/stores/organization';
import { openOptionsPage } from '@/utils/open-options';
import './style.css';

const { message: toastMessage, visible: toastVisible } = useToast();
const orgStore = useOrganizationStore();

const {
  t,
  loading,
  saving,
  folders,
  tags,
  nav,
  query,
  activeLocalId,
  draft,
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
} = useWorkbenchNotes({ enableTabs: true });

const editorRef = ref<{ markRemoteSynced: (n: LocalNote) => Promise<void> } | null>(null);
const showNoteList = ref(true);
const sidebarCollapsed = ref(false);
const isNarrow = ref(false);

const shortcutHint = computed(() =>
  /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ N' : 'Ctrl + N',
);

const listTitle = computed(() => {
  if (nav.value === 'favorites') return t('sidePanel.favorites');
  if (nav.value === 'recentEdited') return t('sidePanel.recentEdited');
  if (nav.value === 'recentOpened') return t('sidePanel.recentOpened');
  if (nav.value === 'trash') return t('workbench.trash');
  if (nav.value === 'folders') {
    const folder = folders.value.find((f) => f.id === activeFolderId.value);
    return folder?.name ?? t('sidePanel.folders');
  }
  if (nav.value === 'tags') {
    const tag = tags.value.find((tg) => tg.id === activeTagId.value);
    return tag?.name ?? t('sidePanel.tags');
  }
  if (nav.value === 'shares') return t('sidePanel.shares');
  return t('workbench.allNotes');
});

function updateNarrow() {
  isNarrow.value = window.innerWidth < 960;
  if (isNarrow.value) {
    sidebarCollapsed.value = true;
    if (draft.value) showNoteList.value = false;
  } else {
    sidebarCollapsed.value = false;
  }
}

async function onCreate() {
  if (isNarrow.value) showNoteList.value = false;
  await createNote();
}

async function onSaveRemote() {
  await saveRemote((n) => editorRef.value?.markRemoteSynced(n) ?? Promise.resolve());
}

function onAddFolder() {
  const name = window.prompt(t('organization.newFolderPlaceholder'));
  if (!name?.trim()) return;
  void orgStore.createFolder(name.trim());
}

function onAddTag() {
  const name = window.prompt(t('organization.newTagPlaceholder'));
  if (!name?.trim()) return;
  void orgStore.createTag(name.trim());
}

async function onRenameFolder(id: number, name: string) {
  await orgStore.renameFolder(id, name);
}

async function onDeleteFolder(id: number) {
  const folder = folders.value.find((f) => f.id === id);
  if (!folder) return;
  if (!window.confirm(t('organization.confirmDeleteFolder', { name: folder.name }))) return;
  const wasActive = nav.value === 'folders' && activeFolderId.value === id;
  await orgStore.removeFolder(id);
  await refreshAll();
  if (wasActive) nav.value = 'all';
}

async function onRenameTag(id: number, name: string, color?: string) {
  await orgStore.updateTag(id, { name, color });
}

async function onDeleteTag(id: number) {
  const tag = tags.value.find((tg) => tg.id === id);
  if (!tag) return;
  if (!window.confirm(t('organization.confirmDeleteTag', { name: tag.name }))) return;
  const wasActive = nav.value === 'tags' && activeTagId.value === id;
  await orgStore.removeTag(id);
  await refreshAll();
  if (wasActive) nav.value = 'all';
}

function openSettings() {
  void openOptionsPage();
}

function openBackup() {
  void openOptionsPage('data');
}

function openServices() {
  void openOptionsPage('services');
}

function onKeydown(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && (e.key === 'n' || e.key === 'N')) {
    e.preventDefault();
    void onCreate();
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', updateNarrow);
  updateNarrow();
  document.title = 'PlainNote';
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', updateNarrow);
});

function onClipDone() {
  clearPendingClip();
  void refreshAll();
}

function onSelectNote(id: number) {
  if (isNarrow.value) showNoteList.value = false;
  void openNote(id);
}

function onNav(v: typeof nav.value) {
  nav.value = v;
  showNoteList.value = true;
}

function onSelectFolder(id: number | null) {
  selectFolder(id);
  showNoteList.value = true;
}

function onSelectTag(id: number) {
  selectTag(id);
  showNoteList.value = true;
}

watch(query, () => {
  if (query.value.trim()) {
    if (nav.value === 'shares' || nav.value === 'trash') nav.value = 'all';
    showNoteList.value = true;
  }
});
</script>

<template>
  <!--
    Correct skeleton:
      Top bar  = Brand | Search   (LEFT–RIGHT siblings)
      Body     = Nav   | Content  (LEFT–RIGHT siblings)
    Never put search in a full-width row above the brand.
  -->
  <div class="pn-workbench flex h-screen w-screen flex-col overflow-hidden bg-pn-bg text-pn-text">
    <WorkbenchTopBar
      :query="query"
      :compact="isNarrow"
      @update:query="query = $event"
      @create="onCreate"
      @open-settings="openSettings"
      @open-services="openServices"
    />

    <div class="flex min-h-0 flex-1 flex-row">
      <WorkbenchSidebar
        hide-brand
        :nav="nav"
        panel="notes"
        :counts="counts"
        :folders="folders"
        :tags="tags"
        :active-folder-id="activeFolderId"
        :active-tag-id="activeTagId"
        :shortcut-hint="shortcutHint"
        :collapsed="sidebarCollapsed && isNarrow"
        @update:nav="onNav"
        @create="onCreate"
        @select-folder="onSelectFolder"
        @select-tag="onSelectTag"
        @open-options="openSettings"
        @open-backup="openBackup"
        @open-services="openServices"
        @add-folder="onAddFolder"
        @add-tag="onAddTag"
        @rename-folder="onRenameFolder"
        @delete-folder="onDeleteFolder"
        @rename-tag="onRenameTag"
        @delete-tag="onDeleteTag"
      />

      <div class="flex min-w-0 flex-1 flex-col bg-white">
        <div
          v-if="isNarrow"
          class="flex items-center gap-1 border-b border-pn-border px-2 py-1"
        >
          <button
            type="button"
            class="flex h-8 items-center gap-1 rounded-[6px] px-2 text-[12px] text-pn-text-sub hover:bg-pn-bg-sub"
            @click="sidebarCollapsed = !sidebarCollapsed"
          >
            <WorkbenchIcon name="all" :size="14" />
            {{ sidebarCollapsed ? $t('workbench.expandSidebar') : $t('workbench.collapseSidebar') }}
          </button>
          <button
            type="button"
            class="flex h-8 items-center gap-1 rounded-[6px] px-2 text-[12px] text-pn-text-sub hover:bg-pn-bg-sub"
            @click="showNoteList = !showNoteList"
          >
            <WorkbenchIcon name="list" :size="14" />
            {{ showNoteList ? $t('workbench.hideNoteList') : $t('workbench.showNoteList') }}
          </button>
        </div>

          <div v-if="pendingClip" class="border-b border-pn-border p-4">
            <ClipAppendPicker @done="onClipDone" @cancel="onClipDone" />
          </div>

          <div v-else-if="nav === 'shares'" class="min-h-0 flex-1 overflow-auto p-4">
            <ShareRecordsPanel />
          </div>

          <div v-else-if="nav === 'trash'" class="flex flex-1 items-center justify-center p-6">
            <p class="text-sm text-pn-text-sub">{{ $t('sidePanel.emptyFiltered') }}</p>
          </div>

          <!--
            Tabs sit to the RIGHT of the note list (above editor only),
            never spanning above the list column.
          -->
          <div v-else class="flex min-h-0 flex-1">
            <WorkbenchNoteList
              v-if="showNoteList || !draft"
              :title="listTitle"
              :notes="filteredNotes"
              :active-local-id="activeLocalId"
              :loading="loading"
              :query="query"
              :show-search="false"
              :empty-title="
                query.trim() || nav === 'favorites'
                  ? t('sidePanel.emptyFiltered')
                  : t('empty.notes')
              "
              :compact="isNarrow && !draft"
              :class="isNarrow && draft ? 'absolute inset-0 z-20 bg-pn-bg' : ''"
              @update:query="query = $event"
              @select="onSelectNote"
              @toggle-favorite="toggleFavoriteFromList"
            />

            <div
              v-if="draft && !(isNarrow && showNoteList)"
              class="flex min-h-0 min-w-0 flex-1 flex-col"
            >
              <WorkbenchTabs
                :tabs="openTabs"
                :active-local-id="activeLocalId"
                @select="onSelectNote"
                @close="closeTab"
                @create="onCreate"
              />
              <WorkbenchEditor
                ref="editorRef"
                :note="draft"
                :saving="saving"
                :narrow="isNarrow"
                @save-remote="onSaveRemote"
                @update:title="updateTitle"
                @update:content="updateContent"
                @update:format="updateFormat"
                @update:folder-id="updateFolderId"
                @update:tag-ids="updateTagIds"
                @toggle-favorite="toggleFavoriteFromEditor"
                @delete-local="deleteLocal"
                @delete-remote="deleteRemote"
              />
            </div>

            <div
              v-else-if="!draft && !showNoteList"
              class="flex flex-1 items-center justify-center text-sm text-pn-text-sub"
            >
              {{ $t('workbench.selectOrCreate') }}
            </div>
          </div>
      </div>
    </div>

    <AppToast :message="toastMessage" :visible="toastVisible" />
  </div>
</template>
