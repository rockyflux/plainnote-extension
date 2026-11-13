<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import type { PendingClip } from '@/types';
import PnButton from '@/components/ui/PnButton.vue';
import PnCard from '@/components/ui/PnCard.vue';
import NoteList from '@/components/notes/NoteList.vue';
import { useNotesStore } from '@/stores/notes';
import { clipperService } from '@/services/clipper-service';
import { formatSelectionPlain, formatSelectionQuote } from '@/utils/clip-format';
import { useToast } from '@/composables/useToast';
import { apiErrorI18nKey } from '@/utils/api-error';

const emit = defineEmits<{
  done: [];
  cancel: [];
}>();

const { t } = useI18n();
const toast = useToast();
const notesStore = useNotesStore();
const { items } = storeToRefs(notesStore);
const clip = ref<PendingClip | null>(null);
const busy = ref(false);

const preview = computed(() => {
  if (!clip.value) return '';
  return clip.value.asMarkdownQuote
    ? formatSelectionQuote(clip.value.selection, clip.value.pageTitle, clip.value.pageUrl)
    : formatSelectionPlain(clip.value.selection, clip.value.pageTitle, clip.value.pageUrl);
});

onMounted(async () => {
  clip.value = await clipperService.getPendingClip();
  await notesStore.refresh();
});

async function appendTo(localId: number) {
  if (!clip.value || busy.value) return;
  busy.value = true;
  try {
    await clipperService.appendToNote(localId, preview.value);
    await clipperService.clearPendingClip();
    await clipperService.notifyNotesChanged();
    await notesStore.refresh();
    toast.show(t('toast.clipAppended'));
    emit('done');
  } catch (err) {
    toast.show(t(apiErrorI18nKey(err)));
  } finally {
    busy.value = false;
  }
}

async function createNew() {
  if (!clip.value || busy.value) return;
  busy.value = true;
  try {
    await clipperService.createFromSelection({
      selection: clip.value.selection,
      pageTitle: clip.value.pageTitle,
      pageUrl: clip.value.pageUrl,
      mode: clip.value.asMarkdownQuote ? 'markdown-quote' : 'plain',
    });
    await clipperService.clearPendingClip();
    await clipperService.notifyNotesChanged();
    await notesStore.refresh();
    toast.show(t('toast.clipSaved'));
    emit('done');
  } catch (err) {
    toast.show(t(apiErrorI18nKey(err)));
  } finally {
    busy.value = false;
  }
}

async function cancel() {
  await clipperService.clearPendingClip();
  emit('cancel');
}
</script>

<template>
  <PnCard v-if="clip" :title="t('clip.pickTitle')">
    <div class="space-y-3">
      <p class="text-xs text-pn-text-sub">{{ t('clip.pickHint') }}</p>
      <pre class="max-h-28 overflow-auto whitespace-pre-wrap rounded-[8px] border border-pn-border bg-pn-bg-sub p-2 text-[11px] text-pn-text">{{ preview }}</pre>

      <NoteList
        :notes="items"
        :empty-title="t('empty.notes')"
        :empty-description="t('clip.emptyNotes')"
        @select="appendTo"
      />

      <div class="flex gap-2">
        <PnButton variant="primary" class="flex-1" :disabled="busy" @click="createNew">
          {{ t('clip.createNew') }}
        </PnButton>
        <PnButton variant="secondary" class="flex-1" :disabled="busy" @click="cancel">
          {{ t('common.cancel') }}
        </PnButton>
      </div>
    </div>
  </PnCard>
</template>
