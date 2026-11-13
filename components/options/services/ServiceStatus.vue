<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ServiceConnectionStatus } from '@/types';

const props = withDefaults(
  defineProps<{
    status: ServiceConnectionStatus | 'testing';
    latencyMs?: number | null;
    errorMessage?: string | null;
    compact?: boolean;
  }>(),
  {
    latencyMs: null,
    errorMessage: null,
    compact: false,
  },
);

const { t } = useI18n();

const label = computed(() => {
  if (props.status === 'testing') return t('options.testing');
  if (props.status === 'ok') return t('options.connectionOk');
  if (props.status === 'error') return t('options.statusError');
  return t('options.statusUnknown');
});

const dotClass = computed(() => {
  if (props.status === 'testing') return 'bg-pn-accent animate-pulse';
  if (props.status === 'ok') return 'bg-pn-success';
  if (props.status === 'error') return 'bg-pn-danger';
  return 'bg-pn-text-muted';
});

const textClass = computed(() => {
  if (props.status === 'testing') return 'text-pn-accent';
  if (props.status === 'ok') return 'text-pn-success';
  if (props.status === 'error') return 'text-pn-danger';
  return 'text-pn-text-sub';
});
</script>

<template>
  <div class="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5" :class="compact ? 'text-[11px]' : 'text-sm'">
    <span class="inline-flex items-center gap-1.5" :class="textClass">
      <span
        v-if="status === 'testing'"
        class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-pn-accent border-t-transparent"
        aria-hidden="true"
      />
      <span v-else class="inline-block h-1.5 w-1.5 shrink-0 rounded-full" :class="dotClass" />
      <span class="font-medium">{{ label }}</span>
    </span>
    <span
      v-if="latencyMs != null && status !== 'testing'"
      class="text-pn-text-muted"
    >
      {{ t('options.latencyMs', { ms: latencyMs }) }}
    </span>
    <span
      v-if="!compact && errorMessage && status === 'error'"
      class="w-full truncate text-pn-danger opacity-90"
      :title="errorMessage"
    >
      {{ errorMessage }}
    </span>
  </div>
</template>
