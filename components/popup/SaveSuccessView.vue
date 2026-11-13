<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { LocalNote } from '@/types';
import PnButton from '@/components/ui/PnButton.vue';
import AppDialog from '@/components/AppDialog.vue';
import ShareLinkItem from '@/components/popup/ShareLinkItem.vue';
import WorkbenchIcon from '@/components/workbench/WorkbenchIcon.vue';
import { useToast } from '@/composables/useToast';
import { shareService } from '@/services/share-service';
import { apiErrorI18nKey } from '@/utils/api-error';

defineProps<{
  note: LocalNote;
  serviceName: string;
}>();

const emit = defineEmits<{
  again: [];
  openNote: [];
  openWorkbench: [];
}>();

const { t } = useI18n();
const toast = useToast();
const busy = ref(false);
const showEditConfirm = ref(false);
const pendingEditAction = ref<'copy' | 'open' | null>(null);

async function withBusy(fn: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  try {
    await fn();
  } catch (err) {
    if (err instanceof Error && /clipboard|NotAllowed|Permission/i.test(err.message)) {
      toast.show(t('errors.clipboardFailed'));
    } else {
      toast.show(t(apiErrorI18nKey(err)));
    }
  } finally {
    busy.value = false;
  }
}

async function copyNote(note: LocalNote) {
  await withBusy(async () => {
    await shareService.copyPublicNoteUrl(note);
    toast.show(t('toast.copied'));
  });
}

async function copyRaw(note: LocalNote) {
  await withBusy(async () => {
    await shareService.copyRawUrl(note);
    toast.show(t('toast.copied'));
  });
}

function requestEdit(action: 'copy' | 'open') {
  pendingEditAction.value = action;
  showEditConfirm.value = true;
}

async function confirmEdit(note: LocalNote) {
  const action = pendingEditAction.value;
  showEditConfirm.value = false;
  pendingEditAction.value = null;
  if (!action) return;
  await withBusy(async () => {
    if (action === 'copy') {
      await shareService.copyEditUrlAfterConfirm(note);
      toast.show(t('toast.copiedPrivateEdit'));
    } else {
      await shareService.openEditUrlAfterConfirm(note);
    }
  });
}

async function openNote(note: LocalNote) {
  await withBusy(async () => {
    await shareService.openNoteUrl(note);
  });
}

async function openRaw(note: LocalNote) {
  await withBusy(async () => {
    await shareService.openRawUrl(note);
  });
}
</script>

<template>
  <div class="flex min-h-0 flex-col">
    <div class="flex-1 space-y-3 overflow-auto p-4">
      <div class="flex items-start gap-3">
        <span
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-white"
          aria-hidden="true"
        >
          <WorkbenchIcon name="check" :size="22" />
        </span>
        <div class="min-w-0 pt-0.5">
          <h2 class="text-[15px] font-semibold text-pn-text">{{ t('popup.saveSuccessTitle') }}</h2>
          <p class="mt-1 flex items-center gap-1.5 text-[12px] text-pn-text-sub">
            <WorkbenchIcon name="cloud" :size="13" />
            <span>{{ t('popup.syncedTo', { name: serviceName }) }}</span>
          </p>
        </div>
      </div>

      <div class="space-y-2">
        <ShareLinkItem
          kind="note"
          :url="note.noteUrl"
          :busy="busy"
          @copy="copyNote(note)"
          @open="openNote(note)"
        />
        <ShareLinkItem
          kind="raw"
          :url="note.rawUrl"
          :busy="busy"
          @copy="copyRaw(note)"
          @open="openRaw(note)"
        />
        <ShareLinkItem
          kind="edit"
          :url="note.editUrl"
          :busy="busy"
          @copy="requestEdit('copy')"
          @open="requestEdit('open')"
        />
      </div>

      <div
        class="flex items-start gap-2 rounded-[8px] border border-[#f5d0a9] bg-[#fff7ed] px-3 py-2.5 text-[12px] text-[#9a3412]"
        role="note"
      >
        <span class="mt-0.5 font-bold" aria-hidden="true">i</span>
        <p>{{ t('popup.editLinkSecurityWarning') }}</p>
      </div>
    </div>

    <div class="flex gap-2 border-t border-pn-border px-4 py-3">
      <PnButton variant="secondary" size="sm" class="flex-1" @click="emit('openNote')">
        <WorkbenchIcon name="external" :size="13" />
        {{ t('popup.openNote') }}
      </PnButton>
      <PnButton variant="secondary" size="sm" class="flex-1" @click="emit('again')">
        {{ t('popup.continueNew') }}
      </PnButton>
      <PnButton variant="primary" size="sm" class="flex-1" @click="emit('openWorkbench')">
        {{ t('popup.openWorkbench') }}
      </PnButton>
    </div>

    <AppDialog
      :open="showEditConfirm"
      :title="t('share.editConfirmTitle')"
      :body="t('share.editConfirmBody')"
      :confirm-label="
        pendingEditAction === 'open' ? t('editor.openEditUrl') : t('share.copyEditUrl')
      "
      confirm-variant="danger"
      @cancel="showEditConfirm = false"
      @confirm="confirmEdit(note)"
    />
  </div>
</template>
