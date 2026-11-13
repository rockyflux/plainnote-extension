<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ServiceRecord } from '@/types';
import { DEFAULT_SERVICE_ID } from '@/types';
import { isHttpsUrl } from '@/utils/url';
import ServiceStatus from '@/components/options/services/ServiceStatus.vue';

const props = defineProps<{
  service: ServiceRecord;
  selected: boolean;
  testing: boolean;
}>();

const emit = defineEmits<{
  select: [];
  openSite: [];
  copyUrl: [];
  edit: [];
  remove: [];
}>();

const { t } = useI18n();
const menuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

const status = computed(() =>
  props.testing ? ('testing' as const) : props.service.lastStatus,
);

const isOfficial = computed(() => props.service.id === DEFAULT_SERVICE_ID);

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
}

function onDocClick(event: MouseEvent) {
  if (!menuRef.value) return;
  if (!menuRef.value.contains(event.target as Node)) {
    menuOpen.value = false;
  }
}

onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="group relative w-full cursor-pointer rounded-[12px] border bg-pn-bg p-3.5 text-left transition"
    :class="
      selected
        ? 'border-pn-accent bg-pn-accent-soft/60 shadow-[0_0_0_1px_var(--color-pn-accent)]'
        : 'border-pn-border hover:border-pn-accent/40'
    "
    @click="emit('select')"
    @keydown.enter.prevent="emit('select')"
    @keydown.space.prevent="emit('select')"
  >
    <div class="flex items-start gap-3">
      <span
        class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-pn-accent-soft text-pn-accent"
        aria-hidden="true"
      >
        <!-- Cloud for official, stack for custom -->
        <svg
          v-if="isOfficial"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M7 18h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.7 1.5A3.5 3.5 0 0 0 7 18Z" />
        </svg>
        <svg
          v-else
          width="16"
          height="16"
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
          <span class="truncate text-sm font-semibold text-pn-text">{{ service.name }}</span>
          <span
            v-if="service.isDefault"
            class="rounded bg-pn-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-pn-accent"
          >
            {{ t('options.defaultBadge') }}
          </span>
        </div>
        <div class="mt-0.5 truncate font-pn-mono text-[11px] text-pn-text-sub">
          {{ service.baseUrl }}
        </div>
        <div class="mt-1.5 flex flex-wrap items-center gap-2">
          <ServiceStatus
            compact
            :status="status"
            :latency-ms="testing ? null : service.lastLatencyMs"
          />
          <span v-if="!isHttpsUrl(service.baseUrl)" class="text-[11px] text-amber-600">
            {{ t('options.httpWarning') }}
          </span>
        </div>
      </div>

      <div ref="menuRef" class="relative flex shrink-0 items-center gap-0.5" @click.stop>
        <button
          type="button"
          class="rounded-md p-1.5 text-pn-text-muted opacity-70 hover:bg-pn-bg hover:text-pn-text group-hover:opacity-100"
          :title="t('options.openServiceSite')"
          :aria-label="t('options.openServiceSite')"
          @click="emit('openSite')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
          </svg>
        </button>
        <button
          type="button"
          class="rounded-md px-1.5 py-0.5 text-pn-text-muted hover:bg-pn-bg hover:text-pn-text"
          :aria-label="t('common.edit')"
          :aria-expanded="menuOpen"
          @click="toggleMenu"
        >
          ···
        </button>
        <div
          v-if="menuOpen"
          class="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-[8px] border border-pn-border bg-pn-bg shadow-lg"
        >
          <button
            type="button"
            class="block w-full px-3 py-2 text-left text-xs hover:bg-pn-bg-sub"
            @click="closeMenu(); emit('edit')"
          >
            {{ t('common.edit') }}
          </button>
          <button
            type="button"
            class="block w-full px-3 py-2 text-left text-xs hover:bg-pn-bg-sub"
            @click="closeMenu(); emit('copyUrl')"
          >
            {{ t('options.copyAddress') }}
          </button>
          <button
            v-if="service.id !== DEFAULT_SERVICE_ID"
            type="button"
            class="block w-full px-3 py-2 text-left text-xs text-pn-danger hover:bg-pn-bg-sub"
            @click="closeMenu(); emit('remove')"
          >
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
