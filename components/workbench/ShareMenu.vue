<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { LocalNote } from '@/types';
import AppDialog from '@/components/AppDialog.vue';
import SharePanel from '@/components/share/SharePanel.vue';
import ShareQr from '@/components/share/ShareQr.vue';
import WorkbenchIcon, { type WorkbenchIconName } from '@/components/workbench/WorkbenchIcon.vue';
import { useToast } from '@/composables/useToast';
import { shareService } from '@/services/share-service';
import { apiErrorI18nKey } from '@/utils/api-error';

const props = defineProps<{
  note: LocalNote;
}>();

const { t } = useI18n();
const toast = useToast();
const open = ref(false);
const showEditConfirm = ref(false);
const showQr = ref(false);
const showSettings = ref(false);
const busy = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const items = computed(
  (): {
    key: string;
    label: string;
    icon: WorkbenchIconName;
    action: () => void;
    danger?: boolean;
  }[] => [
    {
      key: 'note',
      label: t('workbench.shareCopyNote'),
      icon: 'link',
      action: copyNote,
    },
    {
      key: 'raw',
      label: t('workbench.shareCopyRaw'),
      icon: 'code',
      action: copyRaw,
    },
    {
      key: 'edit',
      label: t('workbench.shareCopyEdit'),
      icon: 'edit',
      action: requestCopyEdit,
      danger: true,
    },
    {
      key: 'qr',
      label: t('workbench.shareQr'),
      icon: 'grid',
      action: () => {
        showQr.value = true;
        open.value = false;
      },
    },
    {
      key: 'settings',
      label: t('workbench.shareSettings'),
      icon: 'settings',
      action: () => {
        showSettings.value = true;
        open.value = false;
      },
    },
  ],
);

async function withBusy(fn: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  try {
    await fn();
  } catch (err) {
    toast.show(t(apiErrorI18nKey(err)));
  } finally {
    busy.value = false;
  }
}

async function copyNote() {
  open.value = false;
  await withBusy(async () => {
    await shareService.copyPublicNoteUrl(props.note);
    toast.show(t('toast.copied'));
  });
}

async function copyRaw() {
  open.value = false;
  await withBusy(async () => {
    await shareService.copyRawUrl(props.note);
    toast.show(t('toast.copied'));
  });
}

function requestCopyEdit() {
  open.value = false;
  showEditConfirm.value = true;
}

async function confirmCopyEdit() {
  showEditConfirm.value = false;
  await withBusy(async () => {
    await shareService.copyEditUrlAfterConfirm(props.note);
    toast.show(t('toast.copiedPrivateEdit'));
  });
}

function onDocClick(e: MouseEvent) {
  if (!open.value) return;
  const el = rootRef.value;
  if (el && !el.contains(e.target as Node)) open.value = false;
}

onMounted(() => document.addEventListener('mousedown', onDocClick));
onUnmounted(() => document.removeEventListener('mousedown', onDocClick));
</script>

<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="flex h-8 items-center gap-1.5 rounded-[6px] border border-pn-border px-2.5 text-[13px] font-medium text-pn-text-sub transition hover:bg-pn-bg-sub hover:text-pn-text"
      :disabled="busy"
      @click="open = !open"
    >
      <WorkbenchIcon name="share" :size="14" />
      {{ t('workbench.share') }}
      <WorkbenchIcon name="chevronDown" :size="12" />
    </button>

    <div
      v-if="open"
      class="absolute right-0 z-40 mt-1.5 w-[260px] overflow-hidden rounded-[10px] border border-pn-border bg-white py-1 shadow-[0_8px_24px_rgb(15_23_42_/0.12)]"
      role="menu"
    >
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] transition hover:bg-pn-bg-sub"
        :class="item.danger ? 'text-pn-danger' : 'text-pn-text'"
        role="menuitem"
        @click="item.action()"
      >
        <WorkbenchIcon
          :name="item.icon"
          :size="15"
          :class="item.danger ? 'text-pn-danger' : 'text-pn-text-muted'"
        />
        <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
      </button>
    </div>

    <AppDialog
      :open="showEditConfirm"
      :title="t('share.editConfirmTitle')"
      :body="t('share.editConfirmBody')"
      :confirm-label="t('share.copyEditUrl')"
      @cancel="showEditConfirm = false"
      @confirm="confirmCopyEdit"
    />

    <div
      v-if="showQr"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      @click.self="showQr = false"
    >
      <div class="w-full max-w-sm space-y-3 rounded-[12px] bg-white p-4 shadow-xl">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold text-pn-text">{{ t('workbench.shareQr') }}</div>
          <button type="button" class="text-pn-text-muted hover:text-pn-text" @click="showQr = false">
            <WorkbenchIcon name="close" :size="16" />
          </button>
        </div>
        <p class="truncate text-[11px] text-pn-text-muted">{{ note.noteUrl }}</p>
        <ShareQr :url="note.noteUrl" />
      </div>
    </div>

    <div
      v-if="showSettings"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      @click.self="showSettings = false"
    >
      <div class="max-h-[85vh] w-full max-w-lg overflow-auto rounded-[12px] bg-white p-4 shadow-xl">
        <div class="mb-3 flex items-center justify-between">
          <div class="text-sm font-semibold text-pn-text">{{ t('workbench.shareSettings') }}</div>
          <button type="button" class="text-pn-text-muted hover:text-pn-text" @click="showSettings = false">
            <WorkbenchIcon name="close" :size="16" />
          </button>
        </div>
        <SharePanel :note="note" />
      </div>
    </div>
  </div>
</template>
