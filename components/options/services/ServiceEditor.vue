<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ServiceConnectionResult, ServiceRecord } from '@/types';
import { DEFAULT_SERVICE_ID } from '@/types';
import PnButton from '@/components/ui/PnButton.vue';
import PnInput from '@/components/ui/PnInput.vue';
import ServiceConnectionTest from '@/components/options/services/ServiceConnectionTest.vue';

export type ServiceEditorTab = 'basic' | 'connection';

const props = defineProps<{
  mode: 'edit' | 'create';
  service: ServiceRecord | null;
  name: string;
  baseUrl: string;
  makeDefault: boolean;
  formError: string;
  dirty: boolean;
  testing: boolean;
  draftResult: ServiceConnectionResult | null;
  urlStale: boolean;
  canDelete: boolean;
}>();

const emit = defineEmits<{
  'update:name': [value: string];
  'update:baseUrl': [value: string];
  'update:makeDefault': [value: boolean];
  save: [];
  cancel: [];
  remove: [];
  test: [];
  openSite: [];
}>();

const { t } = useI18n();
const activeTab = ref<ServiceEditorTab>('basic');

watch(
  () => props.service?.id ?? 'new',
  () => {
    activeTab.value = 'basic';
  },
);

const headerName = computed(() =>
  props.name.trim() || (props.mode === 'create' ? t('options.addService') : t('options.editService')),
);

const headerUrl = computed(() => props.baseUrl.trim() || '—');

const isOfficial = computed(() => props.service?.id === DEFAULT_SERVICE_ID);

const saveDisabled = computed(() => {
  if (!props.dirty) return true;
  if (!props.name.trim() || !props.baseUrl.trim()) return true;
  return false;
});

const saveLabel = computed(() =>
  props.mode === 'create' ? t('options.addService') : t('options.saveChanges'),
);
</script>

<template>
  <div class="flex h-full min-h-0 flex-col rounded-[12px] border border-pn-border bg-pn-bg shadow-sm">
    <!-- Header summary -->
    <div class="flex items-start gap-3 border-b border-pn-border px-5 py-4">
      <span
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-pn-accent-soft text-pn-accent"
        aria-hidden="true"
      >
        <svg
          v-if="isOfficial || mode === 'create'"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M7 18h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.7 1.5A3.5 3.5 0 0 0 7 18Z" />
        </svg>
        <svg
          v-else
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
        </svg>
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="truncate text-base font-semibold text-pn-text">{{ headerName }}</h3>
          <span
            v-if="makeDefault || service?.isDefault"
            class="rounded bg-pn-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-pn-accent"
          >
            {{ t('options.defaultServiceTag') }}
          </span>
        </div>
        <div class="mt-0.5 truncate font-pn-mono text-xs text-pn-text-sub">{{ headerUrl }}</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-pn-border px-5">
      <button
        type="button"
        class="relative -mb-px inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition"
        :class="
          activeTab === 'basic'
            ? 'text-pn-accent'
            : 'text-pn-text-sub hover:text-pn-text'
        "
        @click="activeTab = 'basic'"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 7h16M4 12h10M4 17h14" />
        </svg>
        {{ t('options.tabBasicInfo') }}
        <span
          v-if="activeTab === 'basic'"
          class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-pn-accent"
        />
      </button>
      <button
        type="button"
        class="relative -mb-px inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition"
        :class="
          activeTab === 'connection'
            ? 'text-pn-accent'
            : 'text-pn-text-sub hover:text-pn-text'
        "
        @click="activeTab = 'connection'"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        {{ t('options.tabConnectionTest') }}
        <span
          v-if="activeTab === 'connection'"
          class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-pn-accent"
        />
      </button>
    </div>

    <!-- Body -->
    <div class="flex-1 space-y-4 overflow-auto px-5 py-4">
      <template v-if="activeTab === 'basic'">
        <label class="block space-y-1.5">
          <span class="text-sm text-pn-text-sub">
            {{ t('options.serviceName') }}
            <span class="text-pn-danger">*</span>
          </span>
          <PnInput
            :model-value="name"
            :placeholder="t('options.serviceNamePlaceholder')"
            @update:model-value="emit('update:name', $event)"
          />
        </label>

        <label class="block space-y-1.5">
          <span class="text-sm text-pn-text-sub">
            {{ t('options.serverBaseUrl') }}
            <span class="text-pn-danger">*</span>
          </span>
          <div class="relative">
            <PnInput
              :model-value="baseUrl"
              type="url"
              placeholder="https://"
              class="pr-10"
              @update:model-value="emit('update:baseUrl', $event)"
            />
            <button
              v-if="baseUrl.startsWith('http')"
              type="button"
              class="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-pn-text-muted hover:bg-pn-bg-sub hover:text-pn-text"
              :title="t('options.openServiceSite')"
              :aria-label="t('options.openServiceSite')"
              @click="emit('openSite')"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
              </svg>
            </button>
          </div>
        </label>

        <div
          class="rounded-[10px] border border-pn-accent/20 bg-pn-accent-soft px-3.5 py-2.5 text-xs leading-relaxed text-pn-text-sub"
        >
          <div class="font-medium text-pn-text">{{ t('options.serviceUrlHelpTitle') }}</div>
          <p class="mt-1">{{ t('options.serviceUrlHelpBody') }}</p>
          <p class="mt-1.5 font-pn-mono text-[11px] text-pn-accent">
            {{ t('options.serviceUrlExample') }}
          </p>
        </div>

        <div class="flex items-start justify-between gap-4 rounded-[10px] border border-pn-border px-3.5 py-3">
          <div class="min-w-0">
            <div class="text-sm font-medium text-pn-text">{{ t('options.setDefault') }}</div>
            <p class="mt-0.5 text-xs text-pn-text-sub">{{ t('options.setDefaultHint') }}</p>
          </div>
          <button
            type="button"
            role="switch"
            class="relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            :class="makeDefault ? 'bg-pn-accent' : 'bg-pn-border'"
            :aria-checked="makeDefault"
            :aria-label="t('options.setDefault')"
            :disabled="Boolean(service?.isDefault && makeDefault)"
            :title="
              service?.isDefault && makeDefault
                ? t('options.cannotUnsetDefault')
                : undefined
            "
            @click="emit('update:makeDefault', !makeDefault)"
          >
            <span
              class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
              :class="makeDefault ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
      </template>

      <ServiceConnectionTest
        v-else
        :testing="testing"
        :saved-status="service?.lastStatus"
        :saved-latency-ms="service?.lastLatencyMs"
        :saved-error="service?.lastError"
        :draft-result="draftResult"
        :url-stale="urlStale"
        :disabled="!baseUrl.trim()"
        @test="emit('test')"
      />

      <p v-if="formError" class="text-sm text-pn-danger">{{ formError }}</p>
    </div>

    <!-- Footer -->
    <div
      class="flex flex-wrap items-center justify-between gap-3 border-t border-pn-border px-5 py-3.5"
    >
      <PnButton
        v-if="mode === 'edit' && canDelete"
        variant="danger"
        size="sm"
        @click="emit('remove')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
        {{ t('options.deleteServiceAction') }}
      </PnButton>
      <div v-else />

      <div class="flex flex-wrap gap-2">
        <PnButton variant="secondary" @click="emit('cancel')">
          {{ t('common.cancel') }}
        </PnButton>
        <PnButton variant="primary" :disabled="saveDisabled" @click="emit('save')">
          {{ saveLabel }}
        </PnButton>
      </div>
    </div>
  </div>
</template>
