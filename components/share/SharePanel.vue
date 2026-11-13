<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import type { LocalNote } from '@/types';
import PnButton from '@/components/ui/PnButton.vue';
import AppDialog from '@/components/AppDialog.vue';
import ShareQr from '@/components/share/ShareQr.vue';
import { useToast } from '@/composables/useToast';
import { useServicesStore } from '@/stores/services';
import { useSharesStore } from '@/stores/shares';
import { shareService } from '@/services/share-service';
import { maskEditUrl } from '@/utils/share-links';
import { apiErrorI18nKey } from '@/utils/api-error';

const props = defineProps<{
  note: LocalNote;
  /** Compact mode for popup success surface */
  compact?: boolean;
}>();

const { t } = useI18n();
const toast = useToast();
const servicesStore = useServicesStore();
const sharesStore = useSharesStore();
const { items: services } = storeToRefs(servicesStore);

onMounted(() => {
  void servicesStore.refresh();
});

const revealEdit = ref(false);
const showEditConfirm = ref(false);
const showQr = ref(false);
const busy = ref(false);

const serviceLabel = computed(() => {
  const svc = services.value.find((s) => s.id === props.note.serviceId);
  if (!svc) return props.note.serviceId;
  return `${svc.name} · ${svc.baseUrl}`;
});

const editDisplay = computed(() =>
  revealEdit.value ? props.note.editUrl : maskEditUrl(props.note.editUrl),
);

async function withBusy(fn: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  try {
    await fn();
    await sharesStore.refresh();
  } catch (err) {
    toast.show(t(apiErrorI18nKey(err)));
  } finally {
    busy.value = false;
  }
}

async function copyNote() {
  await withBusy(async () => {
    await shareService.copyPublicNoteUrl(props.note);
    toast.show(t('toast.copied'));
  });
}

async function copyRaw() {
  await withBusy(async () => {
    await shareService.copyRawUrl(props.note);
    toast.show(t('toast.copied'));
  });
}

function requestCopyEdit() {
  showEditConfirm.value = true;
}

async function confirmCopyEdit() {
  showEditConfirm.value = false;
  await withBusy(async () => {
    await shareService.copyEditUrlAfterConfirm(props.note);
    toast.show(t('toast.copiedPrivateEdit'));
  });
}

async function openNote() {
  await withBusy(async () => {
    await shareService.openNoteUrl(props.note);
  });
}
</script>

<template>
  <div class="space-y-3 rounded-[8px] border border-pn-border bg-pn-bg-sub p-3">
    <div class="space-y-1">
      <div class="text-xs font-semibold text-pn-text">{{ t('share.panelTitle') }}</div>
      <p class="text-[11px] text-pn-text-sub">{{ t('share.securityHint') }}</p>
      <p class="text-[11px] text-pn-text-sub">
        {{ t('share.serviceSource') }}：{{ serviceLabel }}
      </p>
      <p class="text-[11px] text-pn-text-sub">{{ t('share.noServerToggle') }}</p>
    </div>

    <!-- Public Note URL — primary -->
    <div class="space-y-1.5 rounded-[8px] border border-pn-accent/40 bg-pn-accent-soft/40 p-2.5">
      <div class="text-[11px] font-semibold text-pn-accent">{{ t('share.noteUrl') }}</div>
      <p class="text-[10px] text-pn-text-sub">{{ t('share.noteUrlHint') }}</p>
      <code class="block truncate rounded border border-pn-border bg-pn-bg px-2 py-1 text-[11px]">
        {{ note.noteUrl }}
      </code>
      <div class="flex flex-wrap gap-1.5">
        <PnButton variant="primary" size="sm" :disabled="busy" @click="copyNote">
          {{ t('share.copyNoteUrl') }}
        </PnButton>
        <PnButton variant="secondary" size="sm" :disabled="busy" @click="openNote">
          {{ t('share.openNoteUrl') }}
        </PnButton>
        <PnButton variant="ghost" size="sm" @click="showQr = !showQr">
          {{ showQr ? t('share.hideQr') : t('share.showQr') }}
        </PnButton>
      </div>
      <ShareQr v-if="showQr" :url="note.noteUrl" />
    </div>

    <!-- Raw URL -->
    <div class="space-y-1.5">
      <div class="text-[11px] font-medium text-pn-text-sub">{{ t('share.rawUrl') }}</div>
      <p class="text-[10px] text-pn-text-sub">{{ t('share.rawUrlHint') }}</p>
      <div class="flex gap-1.5">
        <code class="min-w-0 flex-1 truncate rounded border border-pn-border bg-pn-bg px-2 py-1 text-[11px]">
          {{ note.rawUrl }}
        </code>
        <PnButton variant="secondary" size="sm" :disabled="busy" @click="copyRaw">
          {{ t('share.copyRawUrl') }}
        </PnButton>
      </div>
    </div>

    <!-- Edit URL — private -->
    <div class="space-y-1.5 border-t border-pn-border pt-2">
      <div class="text-[11px] font-medium text-pn-danger">{{ t('share.editUrl') }}</div>
      <p class="text-[10px] text-pn-danger/90">{{ t('share.editUrlWarning') }}</p>
      <div class="flex gap-1.5">
        <code
          class="min-w-0 flex-1 truncate rounded border border-pn-danger-border bg-pn-bg px-2 py-1 text-[11px]"
        >
          {{ editDisplay }}
        </code>
        <PnButton variant="ghost" size="sm" @click="revealEdit = !revealEdit">
          {{ revealEdit ? t('share.hideSecret') : t('share.revealSecret') }}
        </PnButton>
      </div>
      <PnButton variant="danger" size="sm" :disabled="busy" @click="requestCopyEdit">
        {{ t('share.copyEditUrl') }}
      </PnButton>
      <p v-if="!compact" class="text-[10px] text-pn-text-sub">{{ t('share.editNotInPublicTemplate') }}</p>
    </div>

    <AppDialog
      :open="showEditConfirm"
      :title="t('share.editConfirmTitle')"
      :body="t('share.editConfirmBody')"
      :confirm-label="t('share.copyEditUrl')"
      @cancel="showEditConfirm = false"
      @confirm="confirmCopyEdit"
    />
  </div>
</template>
