<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import ServiceManager from '@/components/options/ServiceManager.vue';
import DefaultsSettingsForm from '@/components/options/DefaultsSettingsForm.vue';
import EditorPrefsForm from '@/components/options/EditorPrefsForm.vue';
import LanguageSettingsForm from '@/components/options/LanguageSettingsForm.vue';
import ShortcutsHelp from '@/components/options/ShortcutsHelp.vue';
import DataManagementPanel from '@/components/options/DataManagementPanel.vue';
import AboutPanel from '@/components/options/AboutPanel.vue';
import { useSettingsStore } from '@/stores/settings';
import { useToast } from '@/composables/useToast';
import type { LanguagePreference, ThemePreference } from '@/types';

export type SettingsSection =
  | 'services'
  | 'general'
  | 'editor'
  | 'shortcuts'
  | 'data'
  | 'appearance'
  | 'about';

const props = withDefaults(
  defineProps<{
    /** Scroll / focus section on mount */
    focusSection?: 'all' | 'backup' | 'services' | SettingsSection;
    embedded?: boolean;
  }>(),
  {
    focusSection: 'all',
    embedded: false,
  },
);

const { t } = useI18n();
const toast = useToast();
const settingsStore = useSettingsStore();
const { settings, resolvedTheme } = storeToRefs(settingsStore);

const extensionVersion = browser.runtime.getManifest().version;

const navItems: { id: SettingsSection; labelKey: string; icon: string }[] = [
  { id: 'services', labelKey: 'options.nav.services', icon: 'server' },
  { id: 'general', labelKey: 'options.nav.general', icon: 'sliders' },
  { id: 'editor', labelKey: 'options.nav.editor', icon: 'edit' },
  { id: 'shortcuts', labelKey: 'options.nav.shortcuts', icon: 'keyboard' },
  { id: 'data', labelKey: 'options.nav.data', icon: 'database' },
  { id: 'appearance', labelKey: 'options.nav.appearance', icon: 'palette' },
  { id: 'about', labelKey: 'options.nav.about', icon: 'info' },
];

function resolveInitialSection(): SettingsSection {
  if (props.focusSection === 'backup' || props.focusSection === 'data') return 'data';
  if (props.focusSection === 'services') return 'services';
  if (
    props.focusSection === 'general' ||
    props.focusSection === 'editor' ||
    props.focusSection === 'shortcuts' ||
    props.focusSection === 'appearance' ||
    props.focusSection === 'about'
  ) {
    return props.focusSection;
  }
  return 'services';
}

const activeSection = ref<SettingsSection>(resolveInitialSection());
const contentRef = ref<HTMLElement | null>(null);

watch(
  () => props.focusSection,
  () => {
    activeSection.value = resolveInitialSection();
  },
);

onMounted(async () => {
  await nextTick();
  if (props.focusSection !== 'all') {
    contentRef.value?.scrollTo({ top: 0 });
  }
});

const languageLabel = computed(() => {
  const lang = settings.value.language;
  if (lang === 'zh-CN') return t('options.languageZhCN');
  if (lang === 'en') return t('options.languageEn');
  return t('options.languageAuto');
});

async function onLanguageChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as LanguagePreference;
  await settingsStore.setLanguage(value);
  toast.show(t('options.saved'));
}

async function cycleTheme() {
  const order: ThemePreference[] = ['light', 'dark', 'system'];
  const idx = order.indexOf(settings.value.theme);
  const next = order[(idx + 1) % order.length]!;
  await settingsStore.setTheme(next);
  toast.show(t('options.saved'));
}

async function restoreDefaults() {
  await settingsStore.resetToDefaults();
  toast.show(t('options.restoredDefaults'));
}

function selectSection(id: SettingsSection) {
  activeSection.value = id;
  contentRef.value?.scrollTo({ top: 0 });
  if (!props.embedded && typeof window !== 'undefined') {
    const next = `#${id}`;
    if (window.location.hash !== next) {
      history.replaceState(null, '', next);
    }
  }
}
</script>

<template>
  <div
    class="flex min-h-0 flex-1 overflow-hidden"
    :class="embedded ? 'bg-pn-bg' : 'bg-pn-bg-sub'"
  >
    <!-- Left nav -->
    <aside
      class="flex w-[240px] shrink-0 flex-col border-r border-pn-border bg-pn-bg-sidebar"
      :class="embedded ? 'min-h-0' : 'min-h-screen'"
    >
      <div class="border-b border-pn-border px-5 py-5">
        <div class="flex items-center gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-pn-accent text-white"
            aria-hidden="true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3c-2.8 3.2-6 5.8-6 9.2A6 6 0 0 0 12 18.5a6 6 0 0 0 6-6.3C18 8.8 14.8 6.2 12 3Z"
                fill="currentColor"
                opacity="0.95"
              />
              <path
                d="M12 14.5c-1.2 0-2.2-.9-2.2-2.1 0-1.4 1-2.7 2.2-4 1.2 1.3 2.2 2.6 2.2 4 0 1.2-1 2.1-2.2 2.1Z"
                fill="#fff"
                opacity="0.45"
              />
            </svg>
          </span>
          <div class="min-w-0">
            <div class="truncate text-[15px] font-bold text-pn-text">
              {{ t('options.brandTitle') }}
            </div>
            <div class="truncate text-[12px] text-pn-text-sub">
              {{ t('options.brandSubtitle') }}
            </div>
          </div>
        </div>
      </div>

      <nav class="flex-1 space-y-1 overflow-auto px-3 py-4" :aria-label="t('options.title')">
        <button
          v-for="item in navItems"
          :key="item.id"
          type="button"
          class="pn-nav-item"
          :class="{ 'is-active': activeSection === item.id }"
          @click="selectSection(item.id)"
        >
          <span class="inline-flex h-4 w-4 shrink-0 items-center justify-center opacity-80">
            <svg v-if="item.icon === 'server'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="6" rx="1.5" />
              <rect x="3" y="14" width="18" height="6" rx="1.5" />
              <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
              <circle cx="7" cy="17" r="1" fill="currentColor" stroke="none" />
            </svg>
            <svg v-else-if="item.icon === 'sliders'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4" />
            </svg>
            <svg v-else-if="item.icon === 'edit'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
            </svg>
            <svg v-else-if="item.icon === 'keyboard'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
            </svg>
            <svg v-else-if="item.icon === 'database'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <ellipse cx="12" cy="5" rx="8" ry="3" />
              <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
            </svg>
            <svg v-else-if="item.icon === 'palette'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22a10 10 0 1 1 10-10c0 2.2-1.8 3-3.2 3H16a2 2 0 0 0-2 2c0 .8.4 1.5 1 2 .5.4.7 1 .7 1.6A2.4 2.4 0 0 1 13.3 22H12Z" />
              <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
              <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
              <circle cx="16.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 10v6M12 7.5h.01" />
            </svg>
          </span>
          {{ t(item.labelKey) }}
        </button>
      </nav>

      <div class="border-t border-pn-border px-4 py-4">
        <div class="text-[12px] font-medium text-pn-text">
          PlainNote Extension v{{ extensionVersion }}
        </div>
        <div class="mt-1 flex items-center gap-1.5 text-[11px] text-pn-text-sub">
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-pn-success" />
          {{ t('options.upToDate') }}
        </div>
      </div>
    </aside>

    <!-- Main column -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="flex shrink-0 items-center justify-end gap-3 border-b border-pn-border bg-pn-bg/90 px-6 py-3 backdrop-blur"
      >
        <label class="relative inline-flex items-center gap-2 text-sm text-pn-text-sub">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
          </svg>
          <select
            class="pn-focus-ring appearance-none rounded-[8px] border border-pn-border bg-pn-bg py-1.5 pl-2 pr-7 text-sm text-pn-text"
            :value="settings.language"
            :aria-label="t('options.language')"
            @change="onLanguageChange"
          >
            <option value="auto">{{ t('options.languageAuto') }}</option>
            <option value="zh-CN">{{ t('options.languageZhCN') }}</option>
            <option value="en">{{ t('options.languageEn') }}</option>
          </select>
          <span class="pointer-events-none absolute right-2 text-[10px] text-pn-text-muted">▾</span>
        </label>

        <button
          type="button"
          class="pn-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-pn-border bg-pn-bg text-pn-text-sub hover:bg-pn-bg-sub"
          :title="t('options.themeToggleHint', { theme: t(`options.theme.${settings.theme}`) })"
          :aria-label="t('options.themeToggleHint', { theme: t(`options.theme.${settings.theme}`) })"
          @click="cycleTheme"
        >
          <svg
            v-if="resolvedTheme === 'dark'"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
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
            <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5Z" />
          </svg>
        </button>
        <span class="sr-only">{{ languageLabel }}</span>
      </header>

      <div ref="contentRef" class="min-h-0 flex-1 overflow-auto">
        <main class="mx-auto max-w-5xl space-y-5 p-6">
          <ServiceManager v-if="activeSection === 'services'" />
          <DefaultsSettingsForm v-else-if="activeSection === 'general'" />
          <EditorPrefsForm v-else-if="activeSection === 'editor'" />
          <ShortcutsHelp v-else-if="activeSection === 'shortcuts'" />
          <DataManagementPanel v-else-if="activeSection === 'data'" />
          <LanguageSettingsForm v-else-if="activeSection === 'appearance'" />
          <AboutPanel v-else-if="activeSection === 'about'" />

          <div
            v-if="activeSection !== 'about' && activeSection !== 'shortcuts'"
            class="flex flex-wrap items-center justify-end gap-2 border-t border-pn-border pt-4"
          >
            <button
              type="button"
              class="pn-focus-ring rounded-[8px] border border-pn-border bg-pn-bg px-4 py-2 text-sm font-medium text-pn-text-sub hover:bg-pn-bg-sub"
              @click="restoreDefaults"
            >
              {{ t('options.restoreDefaults') }}
            </button>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
