<script lang="ts" setup>
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import type { LocalNote, NoteFormat } from '@/types';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import PnTextarea from '@/components/ui/PnTextarea.vue';
import AppDialog from '@/components/AppDialog.vue';
import WorkbenchToolbar, { type ViewMode } from '@/components/workbench/WorkbenchToolbar.vue';
import WorkbenchIcon from '@/components/workbench/WorkbenchIcon.vue';
import { renderMarkdownPreview } from '@/utils/md-preview';
import { MAX_CONTENT_LENGTH } from '@/utils/constants';
import { draftsService } from '@/services/drafts-service';
import { useSettingsStore } from '@/stores/settings';
import { useOrganizationStore } from '@/stores/organization';

const props = defineProps<{
  note: LocalNote | null;
  saving?: boolean;
  narrow?: boolean;
}>();

const emit = defineEmits<{
  saveRemote: [];
  'update:title': [value: string];
  'update:content': [value: string];
  'update:format': [value: NoteFormat];
  'update:folderId': [value: number | null];
  'update:tagIds': [value: number[]];
  toggleFavorite: [];
  'delete-local': [];
  'delete-remote': [];
}>();

const { t } = useI18n();
const settingsStore = useSettingsStore();
const orgStore = useOrganizationStore();
const { settings } = storeToRefs(settingsStore);
const { folders, tags } = storeToRefs(orgStore);

const mdRef = ref<{
  undo: () => void;
  redo: () => void;
  insertAtCursor: (s: string) => void;
} | null>(null);

function initialViewMode(): ViewMode {
  const preferred = settings.value.editorViewMode;
  if (preferred === 'split' || preferred === 'preview' || preferred === 'edit') {
    return preferred;
  }
  return settings.value.markdownPreviewDefault ? 'split' : 'edit';
}

const viewMode = ref<ViewMode>(initialViewMode());
const fullscreen = ref(false);
const confirmMode = ref<'local' | 'remote' | null>(null);
const draftStatus = ref<'idle' | 'saving' | 'saved'>('idle');
const showTagPicker = ref(false);
const clock = ref('');
let draftTimer: ReturnType<typeof setTimeout> | undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined;

const remoteSnapshot = ref({ title: '', content: '', format: 'markdown' as NoteFormat });

const title = computed({
  get: () => props.note?.title ?? '',
  set: (value: string) => emit('update:title', value),
});

const content = computed({
  get: () => props.note?.content ?? '',
  set: (value: string) => emit('update:content', value),
});

const format = computed({
  get: () => props.note?.format ?? 'markdown',
  set: (value: NoteFormat) => emit('update:format', value),
});

const folderId = computed({
  get: () => props.note?.folderId ?? null,
  set: (value: number | null) => emit('update:folderId', value),
});

const tagIds = computed({
  get: () => props.note?.tags ?? [],
  set: (value: number[]) => emit('update:tagIds', value),
});

const charCount = computed(() => [...content.value].length);
const dirtyVsRemote = computed(() => {
  if (!props.note) return false;
  return (
    (props.note.title ?? '') !== remoteSnapshot.value.title ||
    props.note.content !== remoteSnapshot.value.content ||
    props.note.format !== remoteSnapshot.value.format
  );
});

const previewHtml = computed(() => {
  if (format.value === 'text') {
    return `<pre class="pn-md-pre whitespace-pre-wrap">${escapeText(content.value)}</pre>`;
  }
  return renderMarkdownPreview(content.value);
});

const noteTags = computed(() => {
  const ids = new Set(tagIds.value);
  return tags.value.filter((tg) => tg.id != null && ids.has(tg.id));
});

const availableTags = computed(() => {
  const ids = new Set(tagIds.value);
  return tags.value.filter((tg) => tg.id != null && !ids.has(tg.id));
});

const effectiveViewMode = computed<ViewMode>(() => {
  if (props.narrow && viewMode.value === 'split') return 'edit';
  return viewMode.value;
});

function escapeText(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function tickClock() {
  clock.value = new Date().toLocaleTimeString(undefined, { hour12: false });
}

watch(
  () => props.note?.localId,
  async (localId) => {
    confirmMode.value = null;
    showTagPicker.value = false;
    if (props.note?.format === 'markdown') {
      const preferred = settings.value.editorViewMode;
      viewMode.value =
        preferred === 'split' && props.narrow
          ? settings.value.markdownPreviewDefault
            ? 'preview'
            : 'edit'
          : preferred;
    } else {
      viewMode.value = 'edit';
    }
    if (props.note) {
      remoteSnapshot.value = {
        title: props.note.title ?? '',
        content: props.note.content,
        format: props.note.format,
      };
    }
    draftStatus.value = 'idle';
    if (localId == null || !props.note) return;
    const draft = await draftsService.getEditorDraft(localId);
    if (
      draft &&
      (draft.title !== (props.note.title ?? '') ||
        draft.content !== props.note.content ||
        draft.format !== props.note.format)
    ) {
      emit('update:title', draft.title);
      emit('update:content', draft.content);
      emit('update:format', draft.format);
      draftStatus.value = 'saved';
    }
  },
  { immediate: true },
);

watch([title, content, format], () => {
  if (!props.note?.localId || !dirtyVsRemote.value) return;
  if (!settings.value.autoSaveEnabled) return;
  if (draftTimer) clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    void persistLocalDraft();
  }, settings.value.autoSaveIntervalMs || 450);
});

async function persistLocalDraft() {
  if (!props.note?.localId) return;
  draftStatus.value = 'saving';
  await draftsService.saveEditorDraft({
    noteLocalId: props.note.localId,
    serviceId: props.note.serviceId,
    title: title.value,
    content: content.value,
    format: format.value,
  });
  draftStatus.value = 'saved';
}

async function markRemoteSynced(note: LocalNote) {
  remoteSnapshot.value = {
    title: note.title ?? '',
    content: note.content,
    format: note.format,
  };
  if (note.localId != null) await draftsService.clearEditorDraft(note.localId);
  draftStatus.value = 'idle';
}

defineExpose({ markRemoteSynced });

function insertSnippet(snippet: string) {
  if (format.value === 'markdown' && mdRef.value) {
    mdRef.value.insertAtCursor(snippet);
    return;
  }
  content.value = `${content.value}${content.value && !content.value.endsWith('\n') ? '\n' : ''}${snippet}`;
}

function removeTag(id: number) {
  emit(
    'update:tagIds',
    tagIds.value.filter((x) => x !== id),
  );
}

function addTag(id: number) {
  if (tagIds.value.includes(id)) return;
  emit('update:tagIds', [...tagIds.value, id]);
  showTagPicker.value = false;
}

async function createAndAddTag() {
  const name = window.prompt(t('organization.newTagPlaceholder'));
  if (!name?.trim()) return;
  const id = await orgStore.createTag(name.trim());
  addTag(id);
}

function onConfirm() {
  const m = confirmMode.value;
  confirmMode.value = null;
  if (m === 'local') emit('delete-local');
  if (m === 'remote') emit('delete-remote');
}

function cycleFormat() {
  format.value = format.value === 'markdown' ? 'text' : 'markdown';
}

tickClock();
clockTimer = setInterval(tickClock, 1000);

onUnmounted(() => {
  if (draftTimer) clearTimeout(draftTimer);
  if (clockTimer) clearInterval(clockTimer);
});
</script>

<template>
  <div
    class="flex min-h-0 min-w-0 flex-1 flex-col bg-pn-bg"
    :class="fullscreen ? 'fixed inset-0 z-50' : ''"
  >
    <div v-if="!note" class="flex flex-1 items-center justify-center text-sm text-pn-text-sub">
      {{ $t('workbench.selectOrCreate') }}
    </div>

    <template v-else>
      <div class="flex h-11 shrink-0 items-center gap-1.5 border-b border-pn-border px-3">
        <input
          v-model="title"
          class="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-pn-text outline-none placeholder:text-pn-text-muted"
          :placeholder="t('editor.titlePlaceholder')"
        />
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-[6px] transition"
          :class="note.favorite ? 'text-pn-accent' : 'text-pn-text-muted hover:bg-pn-bg-sub hover:text-pn-text'"
          :title="$t('sidePanel.favorites')"
          @click="emit('toggleFavorite')"
        >
          <WorkbenchIcon name="star" :size="15" />
        </button>
        <button
          type="button"
          class="rounded-[6px] px-2 py-1 text-[12px] text-pn-text-muted hover:bg-pn-bg-sub hover:text-pn-text"
          @click="confirmMode = 'local'"
        >
          {{ t('editor.deleteLocalOnly') }}
        </button>
        <button
          type="button"
          class="rounded-[6px] px-2 py-1 text-[12px] text-pn-danger hover:bg-[#fef2f2]"
          @click="confirmMode = 'remote'"
        >
          {{ t('editor.deleteRemote') }}
        </button>
      </div>

      <WorkbenchToolbar
        v-if="settings.editorShowToolbar"
        v-model:view-mode="viewMode"
        :format="format"
        :note="note"
        :narrow="narrow"
        @insert="insertSnippet"
        @undo="mdRef?.undo()"
        @redo="mdRef?.redo()"
        @fullscreen="fullscreen = !fullscreen"
      />

      <div class="flex min-h-0 flex-1 flex-col md:flex-row">
        <div
          v-if="effectiveViewMode === 'edit' || effectiveViewMode === 'split'"
          class="flex min-h-0 min-w-0 flex-1 flex-col"
          :class="effectiveViewMode === 'split' ? 'md:w-1/2 md:border-r md:border-pn-border' : 'w-full'"
        >
          <MarkdownEditor
            v-if="format === 'markdown'"
            ref="mdRef"
            v-model="content"
            class="min-h-0 flex-1"
            :placeholder="t('editor.contentPlaceholder')"
          />
          <PnTextarea
            v-else
            v-model="content"
            class="min-h-0 flex-1 !rounded-none !border-0"
            :rows="20"
            :placeholder="t('editor.contentPlaceholder')"
          />
        </div>
        <div
          v-if="effectiveViewMode === 'preview' || effectiveViewMode === 'split'"
          class="prose-pn min-h-0 flex-1 overflow-auto px-5 py-5 sm:px-8 sm:py-6"
          :class="effectiveViewMode === 'split' ? 'md:w-1/2' : 'w-full'"
          v-html="previewHtml"
        />
      </div>

      <!--
        Status left | tags + folder + save right (same row as design).
        Tags stay on the right of the content status, never stacked above the list.
      -->
      <div
        class="flex h-11 shrink-0 items-center gap-3 border-t border-pn-border bg-white px-3 text-[12px] text-pn-text-sub"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <span class="shrink-0 tabular-nums text-pn-text-muted">
            {{ $t('workbench.wordCount', { n: charCount.toLocaleString(), max: MAX_CONTENT_LENGTH.toLocaleString() }) }}
          </span>
          <span class="h-3 w-px shrink-0 bg-pn-border" />
          <button
            type="button"
            class="shrink-0 rounded px-1.5 py-0.5 transition hover:bg-pn-bg-sub hover:text-pn-text"
            @click="cycleFormat"
          >
            {{ format === 'markdown' ? t('editor.formatMarkdown') : t('editor.formatText') }}
          </button>
          <span class="h-3 w-px shrink-0 bg-pn-border" />
          <span class="flex min-w-0 items-center gap-1.5 truncate">
            <span
              v-if="draftStatus === 'saved' || (!dirtyVsRemote && settings.autoSaveEnabled)"
              class="text-emerald-500"
            >
              <WorkbenchIcon name="check" :size="12" />
            </span>
            <span class="truncate">
              {{
                draftStatus === 'saving'
                  ? t('editor.draftSaving')
                  : dirtyVsRemote
                    ? t('editor.draftSavedLocal')
                    : t('workbench.autoSaved')
              }}
            </span>
            <span class="shrink-0 tabular-nums text-pn-text-muted">{{ clock }}</span>
          </span>
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
          <span
            v-for="tag in noteTags"
            :key="tag.id"
            class="inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[11px] leading-5"
            :style="tag.color ? { background: `${tag.color}18`, color: tag.color } : undefined"
            :class="!tag.color ? 'bg-pn-accent-soft text-pn-accent' : ''"
          >
            {{ tag.name }}
            <button
              type="button"
              class="text-[12px] leading-none opacity-60 hover:opacity-100"
              @click="removeTag(tag.id!)"
            >
              ×
            </button>
          </span>

          <div class="relative">
            <button
              type="button"
              class="rounded-[4px] border border-dashed border-pn-border px-2 py-0.5 text-[11px] text-pn-text-sub transition hover:border-pn-accent hover:text-pn-accent"
              @click="showTagPicker = !showTagPicker"
            >
              {{ $t('workbench.addTag') }}
            </button>
            <div
              v-if="showTagPicker"
              class="absolute bottom-full right-0 z-30 mb-1.5 max-h-48 w-48 overflow-auto rounded-[8px] border border-pn-border bg-white py-1 shadow-[0_8px_24px_rgb(15_23_42_/0.12)]"
            >
              <button
                v-for="tag in availableTags"
                :key="tag.id"
                type="button"
                class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-pn-text hover:bg-pn-bg-sub"
                @click="addTag(tag.id!)"
              >
                <span
                  class="h-2 w-2 rounded-full"
                  :style="{ background: tag.color || '#94a3b8' }"
                />
                {{ tag.name }}
              </button>
              <button
                type="button"
                class="w-full border-t border-pn-border px-3 py-1.5 text-left text-[12px] text-pn-accent hover:bg-pn-bg-sub"
                @click="createAndAddTag"
              >
                {{ $t('organization.add') }}…
              </button>
            </div>
          </div>

          <select
            class="h-8 max-w-[140px] rounded-[6px] border border-pn-border bg-pn-bg-sub px-2 text-[12px] text-pn-text outline-none"
            :value="folderId ?? ''"
            @change="
              folderId = ($event.target as HTMLSelectElement).value
                ? Number(($event.target as HTMLSelectElement).value)
                : null
            "
          >
            <option value="">{{ t('organization.noFolder') }}</option>
            <option v-for="folder in folders" :key="folder.id" :value="folder.id">
              {{ folder.name }}
            </option>
          </select>

          <button
            type="button"
            class="h-8 rounded-[7px] bg-pn-accent px-3.5 text-[12px] font-medium text-white shadow-[0_1px_2px_rgb(0_102_255_/0.25)] transition hover:brightness-[1.05] disabled:opacity-45"
            :disabled="saving || !dirtyVsRemote"
            @click="emit('saveRemote')"
          >
            {{ saving ? t('loading.saving') : $t('workbench.saveUpdate') }}
          </button>
        </div>
      </div>
    </template>

    <AppDialog
      :open="confirmMode === 'local'"
      :title="t('dialog.deleteLocalTitle')"
      :body="t('dialog.deleteLocalBody')"
      :confirm-label="t('editor.deleteLocalOnly')"
      @cancel="confirmMode = null"
      @confirm="onConfirm"
    />
    <AppDialog
      :open="confirmMode === 'remote'"
      :title="t('dialog.deleteTitle')"
      :body="t('dialog.deleteBody')"
      :confirm-label="t('dialog.confirmDelete')"
      @cancel="confirmMode = null"
      @confirm="onConfirm"
    />
  </div>
</template>

<style scoped>
.prose-pn :deep(.pn-md-h1) {
  margin: 0 0 1rem;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #1f2328;
  line-height: 1.3;
}
.prose-pn :deep(.pn-md-h2) {
  margin: 1.35rem 0 0.65rem;
  padding-left: 0.7rem;
  border-left: 3px solid var(--color-pn-accent);
  font-size: 1.2rem;
  font-weight: 700;
  color: #1f2328;
  line-height: 1.35;
}
.prose-pn :deep(.pn-md-h3) {
  margin: 1rem 0 0.45rem;
  font-size: 1.05rem;
  font-weight: 650;
  color: #1f2328;
}
.prose-pn :deep(.pn-md-p) {
  margin: 0.4rem 0;
  line-height: 1.8;
  color: #3d4450;
  font-size: 15px;
}
.prose-pn :deep(.pn-md-gap) {
  height: 0.55rem;
}
.prose-pn :deep(.pn-md-ul) {
  margin: 0.4rem 0 0.7rem;
  padding: 0;
  list-style: none;
}
.prose-pn :deep(.pn-md-li) {
  position: relative;
  margin: 0.35rem 0;
  padding-left: 1.15rem;
  line-height: 1.7;
  color: #374151;
}
.prose-pn :deep(.pn-md-li:not(.pn-md-task)::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 0.62em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-pn-accent);
}
.prose-pn :deep(.pn-md-task) {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  padding-left: 0;
}
.prose-pn :deep(.pn-md-task::before) {
  display: none;
}
.prose-pn :deep(.pn-md-check) {
  display: inline-flex;
  width: 16px;
  height: 16px;
  margin-top: 0.2em;
  flex-shrink: 0;
  border: 1.5px solid #c5cad3;
  border-radius: 4px;
  background: #fff;
}
.prose-pn :deep(.pn-md-task.is-checked .pn-md-check) {
  border-color: var(--color-pn-accent);
  background-color: var(--color-pn-accent);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%23fff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' d='M3.5 8.2l2.8 2.8 6-6'/%3E%3C/svg%3E");
  background-size: 12px 12px;
  background-position: center;
  background-repeat: no-repeat;
}
.prose-pn :deep(.pn-md-quote) {
  margin: 0.6rem 0;
  padding: 0.2rem 0 0.2rem 0.85rem;
  border-left: 3px solid #d1d5db;
  color: #64748b;
}
.prose-pn :deep(.pn-md-pre) {
  overflow: auto;
  margin: 0.75rem 0;
  border-radius: 8px;
  background: #f5f7fa;
  padding: 0.85rem 1rem;
  font-size: 13px;
  line-height: 1.55;
}
.prose-pn :deep(.pn-md-code) {
  border-radius: 4px;
  background: #f1f5f9;
  padding: 0.1rem 0.35rem;
  font-size: 0.88em;
  color: #0f766e;
}
.prose-pn :deep(.pn-md-a) {
  color: var(--color-pn-accent);
  text-decoration: none;
}
.prose-pn :deep(.pn-md-a:hover) {
  text-decoration: underline;
}
</style>
