<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import type { ServiceRecord } from '@/types';
import PnButton from '@/components/ui/PnButton.vue';
import ServiceListItem from '@/components/options/services/ServiceListItem.vue';
import ServiceEmptyState from '@/components/options/services/ServiceEmptyState.vue';

defineProps<{
  items: ServiceRecord[];
  selectedId: string | null;
  testingId: string | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  add: [];
  select: [id: string];
  openSite: [url: string];
  copyUrl: [url: string];
  edit: [id: string];
  remove: [id: string];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold text-pn-text">{{ t('options.serviceListTitle') }}</h3>
        <span
          class="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-pn-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-pn-accent"
        >
          {{ items.length }}
        </span>
      </div>
      <PnButton variant="primary" size="sm" @click="emit('add')">
        + {{ t('options.addService') }}
      </PnButton>
    </div>

    <div v-if="loading" class="text-sm text-pn-text-sub">{{ t('common.loading') }}</div>

    <ServiceEmptyState v-else-if="items.length === 0" @add="emit('add')" />

    <div v-else class="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
      <ServiceListItem
        v-for="service in items"
        :key="service.id"
        :service="service"
        :selected="selectedId === service.id"
        :testing="testingId === service.id"
        @select="emit('select', service.id)"
        @open-site="emit('openSite', service.baseUrl)"
        @copy-url="emit('copyUrl', service.baseUrl)"
        @edit="emit('edit', service.id)"
        @remove="emit('remove', service.id)"
      />
    </div>

    <div
      class="mt-auto rounded-[12px] border border-pn-accent/20 bg-pn-accent-soft/70 px-3.5 py-3 text-xs leading-relaxed text-pn-text-sub"
    >
      <div class="mb-2 font-semibold text-pn-text">{{ t('options.usageGuideTitle') }}</div>
      <ul class="space-y-1.5">
        <li class="flex gap-2">
          <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-pn-accent" />
          {{ t('options.usageGuideBullet1') }}
        </li>
        <li class="flex gap-2">
          <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-pn-accent" />
          {{ t('options.usageGuideBullet2') }}
        </li>
        <li class="flex gap-2">
          <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-pn-accent" />
          {{ t('options.usageGuideBullet3') }}
        </li>
        <li class="flex gap-2">
          <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-pn-accent" />
          {{ t('options.usageGuideBullet4') }}
        </li>
      </ul>
    </div>
  </div>
</template>
