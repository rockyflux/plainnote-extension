<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue';
import type { LocalFolder, LocalTag } from '@/types';
import type { WorkbenchNavKey } from '@/composables/useWorkbenchNotes';
import WorkbenchIcon, { type WorkbenchIconName } from '@/components/workbench/WorkbenchIcon.vue';

export type WorkbenchPanel = 'notes' | 'settings' | 'backup' | 'services';

const props = defineProps<{
  nav: WorkbenchNavKey;
  panel: WorkbenchPanel;
  counts: {
    all: number;
    favorites: number;
    recentEdited: number;
    shares: number;
    trash: number;
    byFolder: Record<number, number>;
    byTag: Record<number, number>;
  };
  folders: LocalFolder[];
  tags: LocalTag[];
  activeFolderId?: number | null;
  activeTagId?: number | null;
  shortcutHint: string;
  collapsed?: boolean;
  /** Brand lives in WorkbenchTopBar; sidebar is nav-only. */
  hideBrand?: boolean;
}>();

const emit = defineEmits<{
  'update:nav': [value: WorkbenchNavKey];
  create: [];
  selectFolder: [folderId: number | null];
  selectTag: [tagId: number];
  openOptions: [];
  openBackup: [];
  openServices: [];
  addFolder: [];
  addTag: [];
  renameFolder: [id: number, name: string];
  deleteFolder: [id: number];
  renameTag: [id: number, name: string, color?: string];
  deleteTag: [id: number];
}>();

type EditTarget =
  | { kind: 'folder'; id: number }
  | { kind: 'tag'; id: number };

const editing = ref<EditTarget | null>(null);
const editName = ref('');
const editColor = ref('#3b82f6');

const primaryNav = computed(
  (): { key: WorkbenchNavKey; icon: WorkbenchIconName; labelKey: string; count: number }[] => [
    { key: 'all', icon: 'all', labelKey: 'workbench.allNotes', count: props.counts.all },
    {
      key: 'recentEdited',
      icon: 'clock',
      labelKey: 'sidePanel.recentEdited',
      count: props.counts.recentEdited,
    },
    {
      key: 'favorites',
      icon: 'star',
      labelKey: 'sidePanel.favorites',
      count: props.counts.favorites,
    },
    {
      key: 'shares',
      icon: 'share',
      labelKey: 'sidePanel.shares',
      count: props.counts.shares,
    },
    { key: 'trash', icon: 'trash', labelKey: 'workbench.trash', count: props.counts.trash },
  ],
);

function isNavActive(key: WorkbenchNavKey) {
  return props.panel === 'notes' && props.nav === key;
}

function navClass(active: boolean) {
  return active
    ? 'bg-pn-accent-soft font-medium text-pn-accent'
    : 'text-pn-text-sub hover:bg-white/90 hover:text-pn-text';
}

function isEditing(kind: EditTarget['kind'], id: number) {
  return editing.value?.kind === kind && editing.value.id === id;
}

async function focusEditInput() {
  await nextTick();
  const input = document.querySelector<HTMLInputElement>('[data-org-edit-input]');
  input?.focus();
  input?.select();
}

async function startEditFolder(folder: LocalFolder, e: Event) {
  e.stopPropagation();
  e.preventDefault();
  if (folder.id == null) return;
  editing.value = { kind: 'folder', id: folder.id };
  editName.value = folder.name;
  await focusEditInput();
}

async function startEditTag(tag: LocalTag, e: Event) {
  e.stopPropagation();
  e.preventDefault();
  if (tag.id == null) return;
  editing.value = { kind: 'tag', id: tag.id };
  editName.value = tag.name;
  editColor.value = tag.color || '#3b82f6';
  await focusEditInput();
}

function cancelEdit() {
  editing.value = null;
  editName.value = '';
}

function commitEdit() {
  const target = editing.value;
  if (!target) return;
  const name = editName.value.trim();
  if (!name) {
    cancelEdit();
    return;
  }
  if (target.kind === 'folder') {
    emit('renameFolder', target.id, name);
  } else {
    emit('renameTag', target.id, name, editColor.value);
  }
  cancelEdit();
}

function onEditBlur() {
  window.setTimeout(() => {
    if (!editing.value) return;
    const active = document.activeElement;
    if (active instanceof Element && active.closest('[data-org-edit]')) return;
    commitEdit();
  }, 0);
}

function onEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    commitEdit();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    cancelEdit();
  }
}

function onDeleteFolder(folder: LocalFolder, e: Event) {
  e.stopPropagation();
  e.preventDefault();
  if (folder.id == null) return;
  emit('deleteFolder', folder.id);
}

function onDeleteTag(tag: LocalTag, e: Event) {
  e.stopPropagation();
  e.preventDefault();
  if (tag.id == null) return;
  emit('deleteTag', tag.id);
}
</script>

<template>
  <aside
    class="flex h-full shrink-0 flex-col border-r border-pn-border bg-pn-bg-sub text-[13px] transition-[width]"
    :class="collapsed ? 'w-0 overflow-hidden border-0' : 'w-[220px] min-w-[220px]'"
  >
    <div class="px-3 pb-2.5 pt-3">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-[8px] bg-pn-accent px-3.5 py-[10px] text-[13px] font-medium text-white shadow-[0_1px_2px_rgb(0_102_255_/0.25)] transition hover:brightness-[1.06] active:brightness-95"
        @click="emit('create')"
      >
        <span class="flex items-center gap-2">
          <WorkbenchIcon name="plus" :size="15" />
          {{ $t('workbench.newNote') }}
        </span>
        <kbd
          class="rounded-[4px] bg-white/18 px-1.5 py-0.5 text-[11px] font-normal tracking-wide text-white/90"
        >{{ shortcutHint }}</kbd>
      </button>
    </div>

    <nav class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
      <button
        v-for="item in primaryNav"
        :key="item.key"
        type="button"
        class="flex w-full items-center justify-between rounded-[8px] px-2.5 py-[8px] transition"
        :class="navClass(isNavActive(item.key))"
        @click="emit('update:nav', item.key)"
      >
        <span class="flex items-center gap-2.5">
          <WorkbenchIcon :name="item.icon" :size="16" class="opacity-90" />
          {{ $t(item.labelKey) }}
        </span>
        <span class="text-[12px] tabular-nums text-pn-text-muted">{{ item.count }}</span>
      </button>

      <div class="mt-3.5 flex h-7 items-center justify-between px-2.5">
        <span class="text-[12px] font-medium text-pn-text-muted">
          {{ $t('workbench.myNotebooks') }}
        </span>
        <button
          type="button"
          class="flex h-6 w-6 items-center justify-center rounded text-pn-text-muted transition hover:bg-white hover:text-pn-accent"
          :title="$t('organization.add')"
          @click="emit('addFolder')"
        >
          <WorkbenchIcon name="plus" :size="13" />
        </button>
      </div>

      <div
        v-for="folder in folders"
        :key="folder.id"
        class="group relative"
      >
        <div
          v-if="folder.id != null && isEditing('folder', folder.id)"
          data-org-edit
          class="flex items-center gap-1 rounded-[8px] bg-white px-1.5 py-1 ring-1 ring-pn-accent"
        >
          <WorkbenchIcon name="folder" :size="15" class="shrink-0 text-pn-text-muted" />
          <input
            v-model="editName"
            data-org-edit-input
            type="text"
            class="min-w-0 flex-1 bg-transparent px-1 py-0.5 text-[13px] text-pn-text outline-none"
            @keydown="onEditKeydown"
            @blur="onEditBlur"
          />
          <button
            type="button"
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-pn-accent hover:bg-pn-accent-soft"
            :title="$t('common.save')"
            @mousedown.prevent="commitEdit"
          >
            <WorkbenchIcon name="check" :size="13" />
          </button>
        </div>
        <div
          v-else
          class="flex w-full items-center justify-between rounded-[8px] px-2.5 py-[8px] transition"
          :class="
            navClass(panel === 'notes' && nav === 'folders' && activeFolderId === folder.id)
          "
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            @click="emit('selectFolder', folder.id ?? null)"
          >
            <WorkbenchIcon name="folder" :size="15" class="opacity-90" />
            <span class="truncate">{{ folder.name }}</span>
          </button>
          <span class="flex shrink-0 items-center gap-0.5">
            <span
              class="hidden items-center group-hover:flex group-focus-within:flex"
            >
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded text-pn-text-muted hover:bg-white hover:text-pn-accent"
                :title="$t('common.edit')"
                @click="startEditFolder(folder, $event)"
              >
                <WorkbenchIcon name="edit" :size="12" />
              </button>
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded text-pn-text-muted hover:bg-white hover:text-red-500"
                :title="$t('common.delete')"
                @click="onDeleteFolder(folder, $event)"
              >
                <WorkbenchIcon name="trash" :size="12" />
              </button>
            </span>
            <span class="text-[12px] tabular-nums text-pn-text-muted group-hover:hidden group-focus-within:hidden">{{
              counts.byFolder[folder.id!] ?? 0
            }}</span>
          </span>
        </div>
      </div>

      <div class="mt-3.5 flex h-7 items-center justify-between px-2.5">
        <span class="text-[12px] font-medium text-pn-text-muted">
          {{ $t('workbench.myTags') }}
        </span>
        <button
          type="button"
          class="flex h-6 w-6 items-center justify-center rounded text-pn-text-muted transition hover:bg-white hover:text-pn-accent"
          :title="$t('organization.add')"
          @click="emit('addTag')"
        >
          <WorkbenchIcon name="plus" :size="13" />
        </button>
      </div>

      <div
        v-for="tag in tags"
        :key="tag.id"
        class="group relative"
      >
        <div
          v-if="tag.id != null && isEditing('tag', tag.id)"
          data-org-edit
          class="flex items-center gap-1 rounded-[8px] bg-white px-1.5 py-1 ring-1 ring-pn-accent"
        >
          <input
            v-model="editColor"
            type="color"
            class="h-5 w-5 shrink-0 cursor-pointer rounded border border-pn-border bg-transparent p-0"
            :title="$t('organization.tagColor')"
          />
          <input
            v-model="editName"
            data-org-edit-input
            type="text"
            class="min-w-0 flex-1 bg-transparent px-1 py-0.5 text-[13px] text-pn-text outline-none"
            @keydown="onEditKeydown"
            @blur="onEditBlur"
          />
          <button
            type="button"
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-pn-accent hover:bg-pn-accent-soft"
            :title="$t('common.save')"
            @mousedown.prevent="commitEdit"
          >
            <WorkbenchIcon name="check" :size="13" />
          </button>
        </div>
        <div
          v-else
          class="flex w-full items-center justify-between rounded-[8px] px-2.5 py-[8px] transition"
          :class="navClass(panel === 'notes' && nav === 'tags' && activeTagId === tag.id)"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            @click="tag.id != null && emit('selectTag', tag.id)"
          >
            <span
              class="h-2 w-2 shrink-0 rounded-full"
              :style="{ background: tag.color || '#94a3b8' }"
            />
            <span class="truncate">{{ tag.name }}</span>
          </button>
          <span class="flex shrink-0 items-center gap-0.5">
            <span class="hidden items-center group-hover:flex group-focus-within:flex">
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded text-pn-text-muted hover:bg-white hover:text-pn-accent"
                :title="$t('common.edit')"
                @click="startEditTag(tag, $event)"
              >
                <WorkbenchIcon name="edit" :size="12" />
              </button>
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded text-pn-text-muted hover:bg-white hover:text-red-500"
                :title="$t('common.delete')"
                @click="onDeleteTag(tag, $event)"
              >
                <WorkbenchIcon name="trash" :size="12" />
              </button>
            </span>
            <span class="text-[12px] tabular-nums text-pn-text-muted group-hover:hidden group-focus-within:hidden">{{
              counts.byTag[tag.id!] ?? 0
            }}</span>
          </span>
        </div>
      </div>
    </nav>

    <div class="space-y-0.5 border-t border-pn-border px-2 py-2">
      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-[8px] transition"
        :class="navClass(panel === 'backup')"
        @click="emit('openBackup')"
      >
        <span class="flex h-4 w-4 items-center justify-center text-emerald-500" aria-hidden="true">
          <WorkbenchIcon name="check" :size="14" />
        </span>
        {{ $t('workbench.syncBackup') }}
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-[8px] transition"
        :class="navClass(panel === 'services')"
        @click="emit('openServices')"
      >
        <WorkbenchIcon name="service" :size="16" class="opacity-90" />
        {{ $t('workbench.serviceManage') }}
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-[8px] transition"
        :class="navClass(panel === 'settings')"
        @click="emit('openOptions')"
      >
        <WorkbenchIcon name="settings" :size="16" class="opacity-90" />
        {{ $t('workbench.settings') }}
      </button>
    </div>
  </aside>
</template>
