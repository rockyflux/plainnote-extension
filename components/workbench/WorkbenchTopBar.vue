<script lang="ts" setup>
/**
 * Single top row: Brand (left) | Search + actions (right).
 * This is the only correct place for search — never above the brand as a full-width stack.
 */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import WorkbenchBrand from '@/components/workbench/WorkbenchBrand.vue';
import WorkbenchIcon from '@/components/workbench/WorkbenchIcon.vue';
import { useServicesStore } from '@/stores/services';
import { useSettingsStore } from '@/stores/settings';

const props = withDefaults(
  defineProps<{
    query: string;
    compact?: boolean;
    hideBrand?: boolean;
  }>(),
  {
    compact: false,
    hideBrand: false,
  },
);

const emit = defineEmits<{
  'update:query': [value: string];
  create: [];
  openSettings: [];
  openServices: [];
}>();

const searchRef = ref<HTMLInputElement | null>(null);
const servicesStore = useServicesStore();
const settingsStore = useSettingsStore();
const { items: services } = storeToRefs(servicesStore);
const { settings, resolvedLocale } = storeToRefs(settingsStore);

const defaultServiceId = computed({
  get: () => settings.value.defaultServiceId,
  set: (id: string) => {
    void settingsStore.setDefaultServiceId(id);
  },
});

const langLabel = computed(() =>
  resolvedLocale.value === 'zh-CN' ? '中' : 'EN',
);

const searchShortcut = computed(() =>
  /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl + K',
);

function focusSearch() {
  void nextTick(() => searchRef.value?.focus());
}

function toggleLanguage() {
  const next = resolvedLocale.value === 'zh-CN' ? 'en' : 'zh-CN';
  void settingsStore.setLanguage(next);
}

function onKeydown(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    focusSearch();
  }
}

onMounted(() => {
  void servicesStore.refresh();
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
});

defineExpose({ focusSearch });
</script>

<template>
  <header
    class="flex shrink-0 items-center border-b border-pn-border bg-pn-bg-sub"
  >
    <WorkbenchBrand v-if="!props.hideBrand" />

    <div
      class="flex min-w-0 flex-1 items-center gap-2 bg-white px-3 py-2.5"
      :class="!props.hideBrand ? 'border-l border-pn-border' : ''"
    >
      <div class="relative w-[300px] max-w-full shrink-0">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pn-text-muted">
          <WorkbenchIcon name="search" :size="15" />
        </span>
        <input
          ref="searchRef"
          :value="props.query"
          type="search"
          class="h-9 w-[300px] max-w-full rounded-[8px] border border-pn-border bg-pn-bg-sub pl-9 pr-16 text-[13px] text-pn-text outline-none transition placeholder:text-pn-text-muted focus:border-pn-accent focus:bg-white"
          :placeholder="$t('workbench.searchPlaceholder')"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
        />
        <kbd
          class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-pn-border bg-white px-1.5 py-0.5 text-[10px] text-pn-text-muted"
        >{{ searchShortcut }}</kbd>
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-1">
        <label
          v-if="!props.compact"
          class="flex h-9 max-w-[150px] items-center gap-1.5 rounded-[8px] border border-pn-border bg-pn-bg-sub px-2 text-[12px] text-pn-text"
          :title="$t('workbench.defaultService')"
        >
          <WorkbenchIcon name="cloud" :size="14" class="text-pn-accent" />
          <select
            v-model="defaultServiceId"
            class="min-w-0 flex-1 truncate bg-transparent outline-none"
          >
            <option v-for="svc in services" :key="svc.id" :value="svc.id">
              {{ svc.name }}{{ svc.isDefault ? ` (${$t('options.defaultBadge')})` : '' }}
            </option>
          </select>
        </label>

        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-[8px] text-pn-text-muted transition hover:bg-pn-bg-sub hover:text-pn-accent"
          :title="$t('workbench.newNote')"
          @click="emit('create')"
        >
          <WorkbenchIcon name="plus" :size="16" />
        </button>

        <button
          type="button"
          class="flex h-9 min-w-9 items-center justify-center rounded-[8px] px-2 text-[13px] font-semibold text-pn-text-sub transition hover:bg-pn-bg-sub hover:text-pn-accent"
          :title="$t('workbench.switchLanguage')"
          @click="toggleLanguage"
        >
          {{ langLabel }}
        </button>

        <button
          v-if="!props.compact"
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-[8px] text-pn-text-muted transition hover:bg-pn-bg-sub hover:text-pn-accent"
          :title="$t('workbench.serviceManage')"
          @click="emit('openServices')"
        >
          <WorkbenchIcon name="service" :size="16" />
        </button>

        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-[8px] text-pn-text-muted transition hover:bg-pn-bg-sub hover:text-pn-accent"
          :title="$t('workbench.settings')"
          @click="emit('openSettings')"
        >
          <WorkbenchIcon name="settings" :size="16" />
        </button>
      </div>
    </div>
  </header>
</template>
