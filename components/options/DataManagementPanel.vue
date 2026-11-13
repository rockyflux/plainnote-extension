<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import PnButton from '@/components/ui/PnButton.vue';
import AppDialog from '@/components/AppDialog.vue';
import { backupService, parseBackupJson } from '@/services/backup-service';
import { useToast } from '@/composables/useToast';
import { useSettingsStore } from '@/stores/settings';
import { useServicesStore } from '@/stores/services';
import { useNotesStore } from '@/stores/notes';
import { useOrganizationStore } from '@/stores/organization';
import { db } from '@/repositories/db';
import type { BackupImportMode, PlainNoteBackup } from '@/types';

const { t } = useI18n();
const toast = useToast();
const settingsStore = useSettingsStore();
const servicesStore = useServicesStore();
const notesStore = useNotesStore();
const orgStore = useOrganizationStore();

const confirmClear = ref<'drafts' | 'shares' | 'notes-org' | 'all' | null>(null);
const exportWarnOpen = ref(false);
const importMode = ref<BackupImportMode>('merge');
const importConfirmOpen = ref(false);
const pendingImportText = ref<string | null>(null);
const importPreview = ref<PlainNoteBackup | null>(null);
const includeSecretsAck = ref(false);
const busy = ref(false);

const stats = ref({
  notes: 0,
  folders: 0,
  tags: 0,
  shares: 0,
});

async function refreshStats() {
  const [notes, folders, tags, shares] = await Promise.all([
    db.notes.count(),
    db.folders.count(),
    db.tags.count(),
    db.shareRecords.count(),
  ]);
  stats.value = { notes, folders, tags, shares };
}

async function refreshAllStores() {
  await Promise.all([
    settingsStore.hydrate(),
    servicesStore.refresh(),
    notesStore.refresh(),
    orgStore.refresh(),
    refreshStats(),
  ]);
}

function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function doExport() {
  busy.value = true;
  try {
    const json = await backupService.exportJson(true);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadJson(`plainnote-backup-${stamp}.json`, json);
    toast.show(t('options.exportDone'));
  } catch {
    toast.show(t('common.error'));
  } finally {
    busy.value = false;
    exportWarnOpen.value = false;
    includeSecretsAck.value = false;
  }
}

function requestExport() {
  includeSecretsAck.value = false;
  exportWarnOpen.value = true;
}

function onPickImportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const raw = String(reader.result ?? '');
    pendingImportText.value = raw;
    includeSecretsAck.value = false;
    try {
      importPreview.value = parseBackupJson(raw);
      importConfirmOpen.value = true;
    } catch (err) {
      importPreview.value = null;
      pendingImportText.value = null;
      const code = err instanceof Error ? err.message : '';
      if (code.startsWith('BACKUP_')) {
        toast.show(t(`options.importErrors.${code}`));
      } else {
        toast.show(t('options.importFailed'));
      }
    }
  };
  reader.onerror = () => toast.show(t('options.importReadFailed'));
  reader.readAsText(file);
}

async function confirmImport() {
  const raw = pendingImportText.value;
  importConfirmOpen.value = false;
  pendingImportText.value = null;
  importPreview.value = null;
  if (!raw) return;
  if (!includeSecretsAck.value) {
    toast.show(t('options.importNeedAck'));
    return;
  }

  busy.value = true;
  try {
    const backup = parseBackupJson(raw);
    const result = await backupService.importBackup(backup, importMode.value);
    await refreshAllStores();
    toast.show(
      t('options.importDone', {
        notes: result.notes,
        skipped: result.skippedNotes,
      }),
    );
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code.startsWith('BACKUP_')) {
      toast.show(t(`options.importErrors.${code}`));
    } else {
      toast.show(t('options.importFailed'));
    }
  } finally {
    busy.value = false;
    includeSecretsAck.value = false;
  }
}

async function confirmClearAction() {
  const scope = confirmClear.value;
  confirmClear.value = null;
  if (!scope) return;
  busy.value = true;
  try {
    await backupService.clearLocalData(scope);
    await refreshAllStores();
    toast.show(t('options.clearDone'));
  } catch {
    toast.show(t('common.error'));
  } finally {
    busy.value = false;
  }
}

function clearBody() {
  if (confirmClear.value === 'all') return t('options.clearAllBody');
  if (confirmClear.value === 'notes-org') return t('options.clearNotesOrgBody');
  if (confirmClear.value === 'shares') return t('options.clearSharesBody');
  return t('options.clearDraftsBody');
}

onMounted(() => {
  void refreshStats();
});
</script>

<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-lg font-bold text-pn-text">{{ t('options.dataSection') }}</h2>
      <p class="mt-1 text-sm text-pn-text-sub">{{ t('options.dataHint') }}</p>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-[12px] border border-pn-border bg-pn-bg p-3 text-center">
        <div class="text-xl font-bold text-pn-text">{{ stats.notes }}</div>
        <div class="text-xs text-pn-text-sub">{{ t('options.stats.notes') }}</div>
      </div>
      <div class="rounded-[12px] border border-pn-border bg-pn-bg p-3 text-center">
        <div class="text-xl font-bold text-pn-text">{{ stats.folders }}</div>
        <div class="text-xs text-pn-text-sub">{{ t('options.stats.folders') }}</div>
      </div>
      <div class="rounded-[12px] border border-pn-border bg-pn-bg p-3 text-center">
        <div class="text-xl font-bold text-pn-text">{{ stats.tags }}</div>
        <div class="text-xs text-pn-text-sub">{{ t('options.stats.tags') }}</div>
      </div>
      <div class="rounded-[12px] border border-pn-border bg-pn-bg p-3 text-center">
        <div class="text-xl font-bold text-pn-text">{{ stats.shares }}</div>
        <div class="text-xs text-pn-text-sub">{{ t('options.stats.shares') }}</div>
      </div>
    </div>

    <div class="rounded-[12px] border border-pn-border bg-pn-bg p-4 space-y-2">
      <h3 class="text-sm font-semibold text-pn-text">{{ t('options.exportSection') }}</h3>
      <p class="text-xs text-pn-text-sub">{{ t('options.exportHint') }}</p>
      <PnButton variant="secondary" size="sm" :disabled="busy" @click="requestExport">
        {{ t('options.exportButton') }}
      </PnButton>
    </div>

    <div class="rounded-[12px] border border-pn-border bg-pn-bg p-4 space-y-2">
      <h3 class="text-sm font-semibold text-pn-text">{{ t('options.importSection') }}</h3>
      <p class="text-xs text-pn-text-sub">{{ t('options.importHint') }}</p>
      <label class="block space-y-1.5">
        <span class="text-sm text-pn-text-sub">{{ t('options.importMode') }}</span>
        <select
          v-model="importMode"
          class="pn-focus-ring w-full rounded-[8px] border border-pn-border bg-pn-bg px-3 py-2 text-sm text-pn-text"
        >
          <option value="merge">{{ t('options.importModeMerge') }}</option>
          <option value="replace">{{ t('options.importModeReplace') }}</option>
        </select>
      </label>
      <label class="inline-flex">
        <input
          type="file"
          accept="application/json,.json"
          class="text-sm"
          :disabled="busy"
          @change="onPickImportFile"
        />
      </label>
    </div>

    <div class="rounded-[12px] border border-pn-border bg-pn-bg p-4 space-y-2">
      <h3 class="text-sm font-semibold text-pn-text">{{ t('options.localDataSection') }}</h3>
      <p class="text-xs text-pn-text-sub">{{ t('options.localDataHint') }}</p>
      <div class="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        {{ t('options.localVsRemoteWarning') }}
      </div>
      <div class="flex flex-wrap gap-1.5">
        <PnButton variant="secondary" size="sm" :disabled="busy" @click="confirmClear = 'drafts'">
          {{ t('options.clearDrafts') }}
        </PnButton>
        <PnButton variant="secondary" size="sm" :disabled="busy" @click="confirmClear = 'shares'">
          {{ t('options.clearShares') }}
        </PnButton>
        <PnButton
          variant="secondary"
          size="sm"
          :disabled="busy"
          @click="confirmClear = 'notes-org'"
        >
          {{ t('options.clearNotesOrg') }}
        </PnButton>
        <PnButton variant="danger" size="sm" :disabled="busy" @click="confirmClear = 'all'">
          {{ t('options.clearAll') }}
        </PnButton>
      </div>
    </div>

    <AppDialog
      :open="exportWarnOpen"
      :title="t('options.exportWarnTitle')"
      :body="t('options.exportWarnBody')"
      :confirm-label="t('options.exportConfirm')"
      confirm-variant="primary"
      :confirm-disabled="!includeSecretsAck"
      @cancel="exportWarnOpen = false"
      @confirm="doExport"
    >
      <label class="mt-3 flex items-start gap-2 text-sm text-pn-text">
        <input v-model="includeSecretsAck" type="checkbox" class="mt-0.5" />
        <span>{{ t('options.exportSecretsAck') }}</span>
      </label>
    </AppDialog>

    <AppDialog
      :open="importConfirmOpen"
      :title="t('options.importWarnTitle')"
      :body="t('options.importWarnBody')"
      :confirm-label="t('options.importConfirm')"
      confirm-variant="primary"
      :confirm-disabled="!includeSecretsAck"
      @cancel="
        importConfirmOpen = false;
        pendingImportText = null;
        importPreview = null;
      "
      @confirm="confirmImport"
    >
      <div
        v-if="importPreview"
        class="mt-3 rounded-[8px] border border-pn-border bg-pn-bg-sub px-3 py-2 text-xs text-pn-text-sub"
      >
        <div class="font-medium text-pn-text">{{ t('options.importPreviewTitle') }}</div>
        <ul class="mt-1 space-y-0.5">
          <li>{{ t('options.importPreview.version', { version: importPreview.version }) }}</li>
          <li>{{ t('options.importPreview.notes', { count: importPreview.notes.length }) }}</li>
          <li>{{ t('options.importPreview.folders', { count: importPreview.folders.length }) }}</li>
          <li>{{ t('options.importPreview.tags', { count: importPreview.tags.length }) }}</li>
          <li>{{ t('options.importPreview.services', { count: importPreview.services.length }) }}</li>
          <li>{{ t('options.importPreview.shares', { count: importPreview.shareRecords.length }) }}</li>
          <li v-if="importPreview.includesSecrets" class="text-amber-700 dark:text-amber-300">
            {{ t('options.importPreview.includesSecrets') }}
          </li>
        </ul>
      </div>
      <label class="mt-3 flex items-start gap-2 text-sm text-pn-text">
        <input v-model="includeSecretsAck" type="checkbox" class="mt-0.5" />
        <span>{{ t('options.importSecretsAck') }}</span>
      </label>
    </AppDialog>

    <AppDialog
      :open="confirmClear != null"
      :title="t('options.clearConfirmTitle')"
      :body="clearBody()"
      :confirm-label="t('common.delete')"
      @cancel="confirmClear = null"
      @confirm="confirmClearAction"
    />
  </section>
</template>
