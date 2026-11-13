<script lang="ts" setup>
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import type { LocalNote, NoteFormat } from '@/types';
import PnButton from '@/components/ui/PnButton.vue';
import PnInput from '@/components/ui/PnInput.vue';
import PnTextarea from '@/components/ui/PnTextarea.vue';
import PnFormatToggle from '@/components/ui/PnFormatToggle.vue';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import SharePanel from '@/components/share/SharePanel.vue';
import FolderSelect from '@/components/organization/FolderSelect.vue';
import TagSelect from '@/components/organization/TagSelect.vue';
import AppDialog from '@/components/AppDialog.vue';
import { draftsService } from '@/services/drafts-service';
import { useToast } from '@/composables/useToast';
import { useOrganizationStore } from '@/stores/organization';
import { useSettingsStore } from '@/stores/settings';
import { renderMarkdownPreview } from '@/utils/md-preview';

const props = defineProps<{
  note: LocalNote | null;
  saving?: boolean;
}>();

const emit = defineEmits<{
  back: [];
  saveRemote: [];
  'update:title': [value: string];
  'update:content': [value: string];
  'update:format': [value: NoteFormat];
  'update:folderId': [value: number | null];
  'update:tagIds': [value: number[]];
  toggleFavorite: [];
  'delete-local': [];
  'delete-remote': [];
  draftCleared: [];
}>();

const { t } = useI18n();
const toast = useToast();
const org = useOrganizationStore();
const settingsStore = useSettingsStore();
const { folders } = storeToRefs(org);
const { settings } = storeToRefs(settingsStore);

type EditorMode = 'edit' | 'preview';
const mode = ref<EditorMode>(
  settings.value.editorViewMode === 'preview' || settings.value.markdownPreviewDefault
    ? 'preview'
    : 'edit',
);
const expanded = ref(false);
const confirmMode = ref<'local' | 'remote' | null>(null);
const draftStatus = ref<'idle' | 'saving' | 'saved'>('idle');
const hasLocalDraft = ref(false);
let draftTimer: ReturnType<typeof setTimeout> | undefined;

/** Snapshot of last remote-synced content for dirty detection. */
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

const folderLabel = computed(() => {
  if (folderId.value == null) return t('organization.noFolder');
  return folders.value.find((f) => f.id === folderId.value)?.name ?? t('organization.noFolder');
});

function escapeText(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

watch(
  () => props.note?.localId,
  async (localId) => {
    confirmMode.value = null;
    mode.value =
      props.note?.format === 'markdown' &&
      (settings.value.editorViewMode === 'preview' ||
        settings.value.editorViewMode === 'split' ||
        settings.value.markdownPreviewDefault)
        ? 'preview'
        : 'edit';
    if (props.note) {
      remoteSnapshot.value = {
        title: props.note.title ?? '',
        content: props.note.content,
        format: props.note.format,
      };
    }
    hasLocalDraft.value = false;
    draftStatus.value = 'idle';
    if (localId == null || !props.note) return;

    const draft = await draftsService.getEditorDraft(localId);
    if (
      draft &&
      (draft.title !== (props.note.title ?? '') ||
        draft.content !== props.note.content ||
        draft.format !== props.note.format)
    ) {
      hasLocalDraft.value = true;
      emit('update:title', draft.title);
      emit('update:content', draft.content);
      emit('update:format', draft.format);
      draftStatus.value = 'saved';
    }
  },
  { immediate: true },
);

watch(
  [title, content, format],
  () => {
    if (!props.note?.localId || !dirtyVsRemote.value) return;
    if (!settings.value.autoSaveEnabled) return;
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      void persistLocalDraft();
    }, settings.value.autoSaveIntervalMs || 450);
  },
);

onUnmounted(() => {
  if (draftTimer) clearTimeout(draftTimer);
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
  hasLocalDraft.value = true;
  draftStatus.value = 'saved';
}

async function discardLocalDraft() {
  if (!props.note?.localId) return;
  await draftsService.clearEditorDraft(props.note.localId);
  emit('update:title', remoteSnapshot.value.title);
  emit('update:content', remoteSnapshot.value.content);
  emit('update:format', remoteSnapshot.value.format);
  hasLocalDraft.value = false;
  draftStatus.value = 'idle';
  emit('draftCleared');
  toast.show(t('editor.draftDiscarded'));
}

/** Parent calls after successful remote PATCH to reset snapshot + clear draft. */
async function markRemoteSynced(note: LocalNote) {
  remoteSnapshot.value = {
    title: note.title ?? '',
    content: note.content,
    format: note.format,
  };
  if (note.localId != null) {
    await draftsService.clearEditorDraft(note.localId);
  }
  hasLocalDraft.value = false;
  draftStatus.value = 'idle';
}

defineExpose({ markRemoteSynced });

async function copyContent() {
  try {
    await navigator.clipboard.writeText(content.value);
    toast.show(t('toast.copied'));
  } catch {
    toast.show(t('errors.unknown'));
  }
}

function onConfirm() {
  const m = confirmMode.value;
  confirmMode.value = null;
  if (m === 'local') emit('delete-local');
  if (m === 'remote') emit('delete-remote');
}
</script>

<template>
  <div
    class="flex h-full min-h-0 flex-col"
    :class="expanded ? 'fixed inset-0 z-40 bg-pn-bg' : ''"
  >
    <div class="flex items-center justify-between gap-2 border-b border-pn-border px-3 py-2">
      <PnButton variant="ghost" size="sm" @click="emit('back')">
        ← {{ $t('common.back') }}
      </PnButton>
      <div class="flex flex-wrap items-center justify-end gap-1.5">
        <PnButton
          variant="ghost"
          size="sm"
          @click="mode = mode === 'edit' ? 'preview' : 'edit'"
        >
          {{ mode === 'edit' ? $t('editor.preview') : $t('editor.editMode') }}
        </PnButton>
        <PnButton variant="ghost" size="sm" @click="expanded = !expanded">
          {{ expanded ? $t('editor.exitExpand') : $t('editor.expand') }}
        </PnButton>
        <PnFormatToggle v-if="mode === 'edit'" v-model="format" />
        <PnButton
          variant="primary"
          size="sm"
          :disabled="saving || !dirtyVsRemote"
          @click="emit('saveRemote')"
        >
          {{ saving ? $t('loading.saving') : $t('editor.updateRemote') }}
        </PnButton>
      </div>
    </div>

    <div v-if="note" class="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
      <div
        class="rounded-[8px] border px-3 py-2 text-xs"
        :class="
          dirtyVsRemote || hasLocalDraft
            ? 'border-amber-300 bg-amber-50 text-amber-800'
            : 'border-pn-border bg-pn-bg-sub text-pn-text-sub'
        "
      >
        <div v-if="dirtyVsRemote || hasLocalDraft">
          {{ $t('editor.localDraftBanner') }}
          <span v-if="draftStatus === 'saving'"> · {{ $t('editor.draftSaving') }}</span>
          <span v-else-if="draftStatus === 'saved'"> · {{ $t('editor.draftSavedLocal') }}</span>
        </div>
        <div v-else>{{ $t('editor.syncedBanner') }}</div>
        <div class="mt-1 text-[11px] opacity-80">{{ $t('editor.draftVsRemoteHint') }}</div>
        <div v-if="hasLocalDraft || dirtyVsRemote" class="mt-2">
          <PnButton variant="ghost" size="sm" @click="discardLocalDraft">
            {{ $t('editor.discardDraft') }}
          </PnButton>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <PnInput v-model="title" class="flex-1" :placeholder="$t('editor.titlePlaceholder')" />
        <PnButton variant="secondary" size="sm" @click="emit('toggleFavorite')">
          {{ note.favorite ? '★' : '☆' }}
        </PnButton>
      </div>

      <div v-if="mode === 'edit'">
        <MarkdownEditor
          v-if="format === 'markdown'"
          v-model="content"
          :placeholder="$t('editor.contentPlaceholder')"
        />
        <PnTextarea
          v-else
          v-model="content"
          class="min-h-[220px]"
          :rows="12"
          :placeholder="$t('editor.contentPlaceholder')"
        />
      </div>
      <div
        v-else
        class="prose-pn min-h-[220px] rounded-[8px] border border-pn-border bg-pn-bg-sub p-3 text-sm"
        v-html="previewHtml"
      />

      <div class="space-y-2 rounded-[8px] border border-pn-border p-3">
        <div class="text-xs font-medium text-pn-text-sub">
          {{ $t('editor.localOrg') }} · {{ folderLabel }}
        </div>
        <FolderSelect v-model="folderId" />
        <TagSelect v-model="tagIds" />
      </div>

      <div class="flex flex-wrap gap-1.5">
        <PnButton variant="secondary" size="sm" @click="copyContent">
          {{ $t('editor.copyContent') }}
        </PnButton>
      </div>

      <SharePanel :note="note" />

      <div class="flex flex-wrap gap-2 border-t border-pn-border pt-3">
        <PnButton variant="secondary" size="sm" @click="confirmMode = 'local'">
          {{ $t('editor.deleteLocalOnly') }}
        </PnButton>
        <PnButton variant="danger" size="sm" @click="confirmMode = 'remote'">
          {{ $t('editor.deleteRemote') }}
        </PnButton>
      </div>
    </div>

    <AppDialog
      :open="confirmMode === 'local'"
      :title="$t('dialog.deleteLocalTitle')"
      :body="$t('dialog.deleteLocalBody')"
      :confirm-label="$t('editor.deleteLocalOnly')"
      @cancel="confirmMode = null"
      @confirm="onConfirm"
    />
    <AppDialog
      :open="confirmMode === 'remote'"
      :title="$t('dialog.deleteTitle')"
      :body="$t('dialog.deleteBody')"
      :confirm-label="$t('dialog.confirmDelete')"
      @cancel="confirmMode = null"
      @confirm="onConfirm"
    />
  </div>
</template>

<style scoped>
:deep(.pn-md-h1) {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0.5rem 0;
}
:deep(.pn-md-h2) {
  font-size: 1.1rem;
  font-weight: 650;
  margin: 0.4rem 0;
}
:deep(.pn-md-h3) {
  font-size: 1rem;
  font-weight: 600;
  margin: 0.35rem 0;
}
:deep(.pn-md-p) {
  margin: 0.35rem 0;
  line-height: 1.5;
}
:deep(.pn-md-quote) {
  border-left: 3px solid #cbd5e1;
  margin: 0.4rem 0;
  padding-left: 0.75rem;
  color: #64748b;
}
:deep(.pn-md-pre) {
  overflow: auto;
  border-radius: 6px;
  background: #f8fafc;
  padding: 0.75rem;
  font-size: 12px;
}
:deep(.pn-md-code) {
  border-radius: 4px;
  background: #f1f5f9;
  padding: 0.1rem 0.3rem;
  font-size: 0.85em;
}
:deep(.pn-md-a) {
  color: #2563eb;
  text-decoration: underline;
}
:deep(.pn-md-li) {
  margin-left: 1rem;
  list-style: disc;
}
</style>
