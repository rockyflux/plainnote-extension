<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { LocalNote } from '@/types';
import AppToast from '@/components/AppToast.vue';
import ClipAppendPicker from '@/components/clip/ClipAppendPicker.vue';
import ShareRecordsPanel from '@/components/notes/ShareRecordsPanel.vue';
import WorkbenchSidebar, {
  type WorkbenchPanel,
} from '@/components/workbench/WorkbenchSidebar.vue';
import WorkbenchTopBar from '@/components/workbench/WorkbenchTopBar.vue';
import WorkbenchNoteList from '@/components/workbench/WorkbenchNoteList.vue';
import WorkbenchEditor from '@/components/workbench/WorkbenchEditor.vue';
import WorkbenchIcon from '@/components/workbench/WorkbenchIcon.vue';
import { useToast } from '@/composables/useToast';
import { useWorkbenchNotes } from '@/composables/useWorkbenchNotes';
import { useOrganizationStore } from '@/stores/organization';
import { openWorkbenchTab } from '@/utils/open-workbench';
import { openOptionsPage } from '@/utils/open-options';

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
  activeFolderId,
  activeTagId,
  pendingClip,
  counts,
  filteredNotes,
  refreshAll,
  openNote,
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
} = useWorkbenchNotes({ enableTabs: false });

const editorRef = ref<{ markRemoteSynced: (n: LocalNote) => Promise<void> } | null>(null);
const panel = ref<WorkbenchPanel>('notes');
const showSidebar = ref(true);
type MobileView = 'list' | 'editor' | 'shares';
const mobileView = ref<MobileView>('list');

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

async function onCreate() {
  panel.value = 'notes';
  const note = await createNote();
  if (note) mobileView.value = 'editor';
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
  if (wasActive) {
    nav.value = 'all';
    mobileView.value = 'list';
  }
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
  if (wasActive) {
    nav.value = 'all';
    mobileView.value = 'list';
  }
}

async function openFullWorkbench() {
  await openWorkbenchTab(activeLocalId.value ?? undefined);
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

function onNav(v: typeof nav.value) {
  panel.value = 'notes';
  nav.value = v;
  mobileView.value = v === 'shares' ? 'shares' : 'list';
}

function onSelectFolder(id: number | null) {
  selectFolder(id);
  mobileView.value = 'list';
}

function onSelectTag(id: number) {
  selectTag(id);
  mobileView.value = 'list';
}

async function onSelectNote(id: number) {
  await openNote(id);
  mobileView.value = 'editor';
}

function backToList() {
  mobileView.value = 'list';
  void refreshAll();
}

async function onDeleteLocal() {
  await deleteLocal();
  mobileView.value = 'list';
}

async function onDeleteRemote() {
  await deleteRemote();
  mobileView.value = 'list';
}

function onClipDone() {
  clearPendingClip();
  mobileView.value = 'list';
  void refreshAll();
}

function onKeydown(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && (e.key === 'n' || e.key === 'N')) {
    e.preventDefault();
    void onCreate();
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onUnmounted(() => document.removeEventListener('keydown', onKeydown));

watch(pendingClip, (on) => {
  if (on) mobileView.value = 'list';
});

watch(activeLocalId, (id) => {
  if (id != null && draft.value) mobileView.value = 'editor';
});
</script>

<template>
  <!--
    Top: Brand | Search (left–right)
    Body: Nav | List   (left–right)
  -->
  <div class="flex h-screen w-full flex-col overflow-hidden bg-pn-bg text-pn-text">
    <WorkbenchTopBar
      v-if="mobileView !== 'editor'"
      :query="query"
      compact
      :hide-brand="!showSidebar"
      @update:query="query = $event"
      @create="onCreate"
      @open-settings="openSettings"
      @open-services="openServices"
    />

    <div
      v-if="mobileView === 'editor'"
      class="flex items-center gap-1 border-b border-pn-border bg-white px-2 py-1"
    >
      <button
        type="button"
        class="flex h-8 items-center gap-1 rounded-[6px] px-2 text-[12px] text-pn-text-sub hover:bg-pn-bg-sub"
        @click="backToList"
      >
        ← {{ $t('common.back') }}
      </button>
      <button
        type="button"
        class="ml-auto flex h-8 items-center gap-1 rounded-[6px] px-2 text-[12px] text-pn-accent hover:bg-pn-accent-soft"
        @click="openFullWorkbench()"
      >
        {{ $t('popup.openWorkbench') }}
      </button>
    </div>

    <div v-else class="flex items-center gap-1 border-b border-pn-border bg-white px-2 py-1">
      <button
        type="button"
        class="flex h-8 items-center gap-1 rounded-[6px] px-2 text-[12px] text-pn-text-sub hover:bg-pn-bg-sub"
        @click="showSidebar = !showSidebar"
      >
        <WorkbenchIcon name="all" :size="14" />
        {{ showSidebar ? $t('workbench.collapseSidebar') : $t('workbench.expandSidebar') }}
      </button>
      <button
        type="button"
        class="ml-auto flex h-8 items-center gap-1 rounded-[6px] px-2 text-[12px] text-pn-accent hover:bg-pn-accent-soft"
        @click="openFullWorkbench()"
      >
        {{ $t('popup.openWorkbench') }}
      </button>
    </div>

    <div class="flex min-h-0 flex-1 flex-row">
      <WorkbenchSidebar
        v-if="showSidebar && mobileView !== 'editor'"
        hide-brand
        :nav="nav"
        :panel="panel"
        :counts="counts"
        :folders="folders"
        :tags="tags"
        :active-folder-id="activeFolderId"
        :active-tag-id="activeTagId"
        :shortcut-hint="shortcutHint"
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

      <div class="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
        <div v-if="pendingClip" class="p-3">
          <ClipAppendPicker @done="onClipDone" @cancel="onClipDone" />
        </div>

        <div v-else-if="mobileView === 'shares'" class="min-h-0 flex-1 overflow-auto p-3">
          <ShareRecordsPanel />
        </div>

        <WorkbenchNoteList
          v-else-if="mobileView === 'list'"
          compact
          :title="listTitle"
          :notes="filteredNotes"
          :active-local-id="activeLocalId"
          :loading="loading"
          :query="query"
          :show-search="false"
          :empty-title="
            query.trim() || nav === 'favorites' ? t('sidePanel.emptyFiltered') : t('empty.notes')
          "
          :page-size="15"
          @update:query="query = $event"
          @select="onSelectNote"
          @toggle-favorite="toggleFavoriteFromList"
        />

        <WorkbenchEditor
          v-else
          ref="editorRef"
          narrow
          :note="draft"
          :saving="saving"
          @save-remote="onSaveRemote"
          @update:title="updateTitle"
          @update:content="updateContent"
          @update:format="updateFormat"
          @update:folder-id="updateFolderId"
          @update:tag-ids="updateTagIds"
          @toggle-favorite="toggleFavoriteFromEditor"
          @delete-local="onDeleteLocal"
          @delete-remote="onDeleteRemote"
        />
      </div>
    </div>

    <AppToast :message="toastMessage" :visible="toastVisible" />
  </div>
</template>
