<script lang="ts" setup>
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import PnButton from '@/components/ui/PnButton.vue';
import PnEmpty from '@/components/ui/PnEmpty.vue';
import PnSearchInput from '@/components/ui/PnSearchInput.vue';
import { useSharesStore, type ShareSort } from '@/stores/shares';
import { useServicesStore } from '@/stores/services';
import { useSettingsStore } from '@/stores/settings';
import { useToast } from '@/composables/useToast';
import { formatDateTime } from '@/utils/format';

const { t } = useI18n();
const toast = useToast();
const shares = useSharesStore();
const servicesStore = useServicesStore();
const settings = useSettingsStore();
const { filtered, loading, query, sort, items } = storeToRefs(shares);
const { items: services } = storeToRefs(servicesStore);
const { resolvedLocale } = storeToRefs(settings);

onMounted(() => {
  void shares.refresh();
  void servicesStore.refresh();
});

function channelLabel(channel: string) {
  if (channel === 'copy-note-url') return t('share.channelNote');
  if (channel === 'copy-raw-url') return t('share.channelRaw');
  if (channel === 'copy-edit-url') return t('share.channelEdit');
  return t('share.channelOther');
}

function serviceName(serviceId: string | null) {
  if (!serviceId) return '—';
  return services.value.find((s) => s.id === serviceId)?.name ?? serviceId;
}

async function copyRow(url: string | null) {
  if (!url) {
    toast.show(t('share.noUrlToCopy'));
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.show(t('toast.copied'));
  } catch {
    toast.show(t('errors.unknown'));
  }
}

function openRow(url: string | null) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function removeRow(id: number | undefined) {
  if (id == null) return;
  await shares.remove(id);
  toast.show(t('share.recordDeleted'));
}
</script>

<template>
  <div class="space-y-3">
    <div class="space-y-1">
      <p class="text-xs text-pn-text-sub">{{ t('sidePanel.sharesHint') }}</p>
      <p class="text-[11px] text-pn-text-sub">{{ t('share.historyNotAccess') }}</p>
    </div>

    <PnSearchInput
      :model-value="query"
      :placeholder="t('share.searchPlaceholder')"
      @update:model-value="query = $event"
    />

    <div class="flex flex-wrap items-center gap-2">
      <select
        class="pn-focus-ring min-w-0 flex-1 rounded-[8px] border border-pn-border bg-pn-bg px-2 py-1.5 text-xs"
        :value="sort"
        @change="sort = ($event.target as HTMLSelectElement).value as ShareSort"
      >
        <option value="timeDesc">{{ t('share.sortTimeDesc') }}</option>
        <option value="timeAsc">{{ t('share.sortTimeAsc') }}</option>
      </select>
      <PnButton variant="ghost" size="sm" :disabled="!items.length" @click="shares.clear()">
        {{ t('sidePanel.clearShares') }}
      </PnButton>
    </div>

    <p v-if="loading" class="text-sm text-pn-text-sub">{{ t('common.loading') }}</p>
    <PnEmpty
      v-else-if="filtered.length === 0"
      :title="t('sidePanel.shares')"
      :description="t('empty.history')"
    />
    <ul v-else class="space-y-2">
      <li
        v-for="row in filtered"
        :key="row.id"
        class="rounded-[8px] border border-pn-border bg-pn-bg px-3 py-2"
      >
        <div class="truncate text-sm font-medium text-pn-text">
          {{ row.title || t('sidePanel.untitled') }}
        </div>
        <div class="mt-1 text-[11px] text-pn-text-sub">
          {{ channelLabel(row.channel) }}
          ·
          {{ serviceName(row.serviceId) }}
          ·
          {{ formatDateTime(row.sharedAt, resolvedLocale) }}
        </div>
        <a
          v-if="row.sharedUrl"
          :href="row.sharedUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-1 block truncate text-[11px] text-pn-accent"
        >
          {{ row.sharedUrl }}
        </a>
        <div v-else class="mt-1 text-[11px] text-pn-danger">
          {{ t('sidePanel.privateShareRecord') }}
        </div>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <PnButton
            variant="secondary"
            size="sm"
            :disabled="!row.sharedUrl"
            @click="copyRow(row.sharedUrl)"
          >
            {{ t('common.copy') }}
          </PnButton>
          <PnButton
            variant="secondary"
            size="sm"
            :disabled="!row.sharedUrl"
            @click="openRow(row.sharedUrl)"
          >
            {{ t('share.open') }}
          </PnButton>
          <PnButton variant="ghost" size="sm" @click="removeRow(row.id)">
            {{ t('share.deleteRecord') }}
          </PnButton>
        </div>
      </li>
    </ul>
  </div>
</template>
