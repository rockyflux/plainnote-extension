<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import type { LanguagePreference, ThemePreference } from '@/types';
import PnButton from '@/components/ui/PnButton.vue';
import { useSettingsStore } from '@/stores/settings';
import { useToast } from '@/composables/useToast';

const { t } = useI18n();
const toast = useToast();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);

const language = ref<LanguagePreference>(settings.value.language);
const theme = ref<ThemePreference>(settings.value.theme);

watch(
  () => settings.value.language,
  (value) => {
    language.value = value;
  },
);

watch(
  () => settings.value.theme,
  (value) => {
    theme.value = value;
  },
);

async function onLanguageChange() {
  await settingsStore.setLanguage(language.value);
  toast.show(t('options.saved'));
}

async function onThemeChange(next: ThemePreference) {
  theme.value = next;
  await settingsStore.setTheme(next);
  toast.show(t('options.saved'));
}

async function onSave() {
  await settingsStore.updatePreferences({
    language: language.value,
    theme: theme.value,
  });
  toast.show(t('options.saved'));
}
</script>

<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-lg font-bold text-pn-text">{{ t('options.appearanceSection') }}</h2>
      <p class="mt-1 text-sm text-pn-text-sub">{{ t('options.appearanceHint') }}</p>
    </div>

    <div class="rounded-[12px] border border-pn-border bg-pn-bg p-4">
      <label class="block space-y-1.5">
        <span class="text-sm font-medium text-pn-text">{{ t('options.language') }}</span>
        <select
          v-model="language"
          class="pn-focus-ring w-full rounded-[8px] border border-pn-border bg-pn-bg px-3 py-2 text-sm text-pn-text"
          @change="onLanguageChange"
        >
          <option value="auto">{{ t('options.languageAuto') }}</option>
          <option value="zh-CN">{{ t('options.languageZhCN') }}</option>
          <option value="en">{{ t('options.languageEn') }}</option>
        </select>
      </label>
    </div>

    <div class="rounded-[12px] border border-pn-border bg-pn-bg p-4">
      <div class="text-sm font-medium text-pn-text">{{ t('options.themeLabel') }}</div>
      <p class="mt-1 text-xs text-pn-text-sub">{{ t('options.themeHint') }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="mode in (['light', 'dark', 'system'] as ThemePreference[])"
          :key="mode"
          type="button"
          class="rounded-[8px] border px-3 py-1.5 text-sm transition"
          :class="
            theme === mode
              ? 'border-pn-accent bg-pn-accent-soft font-medium text-pn-accent'
              : 'border-pn-border text-pn-text-sub hover:border-pn-accent/40'
          "
          @click="onThemeChange(mode)"
        >
          {{ t(`options.theme.${mode}`) }}
        </button>
      </div>
    </div>

    <PnButton variant="primary" @click="onSave">{{ t('common.save') }}</PnButton>
  </section>
</template>
