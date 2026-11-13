<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ServiceConnectionResult, ServiceConnectionStatus } from '@/types';
import PnButton from '@/components/ui/PnButton.vue';
import ServiceStatus from '@/components/options/services/ServiceStatus.vue';

const props = defineProps<{
  testing: boolean;
  /** Persisted status when form URL matches saved service. */
  savedStatus?: ServiceConnectionStatus;
  savedLatencyMs?: number | null;
  savedError?: string | null;
  /** Draft probe result for the current form URL (invalidated when URL changes). */
  draftResult?: ServiceConnectionResult | null;
  urlStale: boolean;
  disabled?: boolean;
}>();

defineEmits<{
  test: [];
}>();

const { t } = useI18n();

const displayStatus = computed(() => {
  if (props.testing) return 'testing' as const;
  if (props.urlStale) {
    return props.draftResult?.status ?? ('unknown' as const);
  }
  if (props.draftResult) return props.draftResult.status;
  return props.savedStatus ?? ('unknown' as const);
});

const displayLatency = computed(() => {
  if (props.testing) return null;
  if (props.urlStale) return props.draftResult?.latencyMs ?? null;
  if (props.draftResult) return props.draftResult.latencyMs;
  return props.savedLatencyMs ?? null;
});

const displayError = computed(() => {
  if (props.testing || displayStatus.value !== 'error') return null;
  const raw =
    props.urlStale || props.draftResult
      ? props.draftResult?.message
      : props.savedError;
  if (!raw) return null;
  if (raw === 'TIMEOUT') return t('options.connectionTimeout');
  if (raw === 'NETWORK_ERROR') return t('options.connectionNetworkError');
  if (raw === 'HOST_PERMISSION_DENIED') return t('errors.hostPermissionDenied');
  if (raw.startsWith('HTTP_') || raw === 'OK') {
    return t('options.connectionFailed', { code: raw });
  }
  // ServerUrlError codes
  const urlKey = `errors.serverUrl.${raw}`;
  const translated = t(urlKey);
  if (translated !== urlKey) return translated;
  return t('options.connectionFailed', { code: raw });
});

const panelClass = computed(() => {
  const status = displayStatus.value;
  if (status === 'ok') return 'bg-pn-success-soft text-pn-success border-pn-success/20';
  if (status === 'error') return 'border-pn-danger-border bg-red-50 text-pn-danger dark:bg-red-950/40';
  if (status === 'testing') return 'border-pn-accent/20 bg-pn-accent-soft text-pn-accent';
  return 'border-pn-border bg-pn-bg-sub text-pn-text-sub';
});
</script>

<template>
  <div class="space-y-3">
    <p class="text-xs leading-relaxed text-pn-text-sub">
      {{ t('options.connectionTestHint') }}
    </p>

    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border px-3.5 py-3"
      :class="panelClass"
    >
      <ServiceStatus
        :status="displayStatus"
        :latency-ms="displayLatency"
        :error-message="displayError"
      />
      <PnButton
        variant="secondary"
        size="sm"
        :disabled="disabled || testing"
        @click="$emit('test')"
      >
        {{ testing ? t('options.testing') : t('options.testConnection') }}
      </PnButton>
    </div>

    <p v-if="urlStale && !draftResult && !testing" class="text-xs text-pn-text-muted">
      {{ t('options.testResultInvalidated') }}
    </p>
  </div>
</template>
