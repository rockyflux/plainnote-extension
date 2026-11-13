<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import type { EditorViewMode } from '@/types';
import {
  DEFAULT_SETTINGS,
  EDITOR_FONT_SIZE_MAX,
  EDITOR_FONT_SIZE_MIN,
} from '@/types';
import PnButton from '@/components/ui/PnButton.vue';
import PnInput from '@/components/ui/PnInput.vue';
import { useSettingsStore } from '@/stores/settings';
import { useToast } from '@/composables/useToast';

const { t } = useI18n();
const toast = useToast();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);

const editorViewMode = ref<EditorViewMode>(settings.value.editorViewMode);
const markdownPreviewDefault = ref(settings.value.markdownPreviewDefault);
const editorFontSize = ref(String(settings.value.editorFontSize));
const editorFontFamily = ref(settings.value.editorFontFamily);
const editorLineNumbers = ref(settings.value.editorLineNumbers);
const editorWordWrap = ref(settings.value.editorWordWrap);
const editorShowToolbar = ref(settings.value.editorShowToolbar);

watch(
  () => settings.value,
  (value) => {
    editorViewMode.value = value.editorViewMode;
    markdownPreviewDefault.value = value.markdownPreviewDefault;
    editorFontSize.value = String(value.editorFontSize);
    editorFontFamily.value = value.editorFontFamily;
    editorLineNumbers.value = value.editorLineNumbers;
    editorWordWrap.value = value.editorWordWrap;
    editorShowToolbar.value = value.editorShowToolbar;
  },
  { deep: true },
);

const fontPresets = [
  { value: 'var(--font-pn-mono)', labelKey: 'options.fontMono' },
  { value: 'var(--font-pn)', labelKey: 'options.fontSans' },
  {
    value: "Consolas, 'Courier New', monospace",
    labelKey: 'options.fontConsolas',
  },
];

async function applyImmediate(patch: Record<string, unknown>) {
  await settingsStore.updatePreferences(patch as Parameters<typeof settingsStore.updatePreferences>[0]);
}

async function onViewModeChange(mode: EditorViewMode) {
  editorViewMode.value = mode;
  markdownPreviewDefault.value = mode !== 'edit';
  await applyImmediate({
    editorViewMode: mode,
    markdownPreviewDefault: mode !== 'edit',
  });
}

async function onToggle(
  key:
    | 'markdownPreviewDefault'
    | 'editorLineNumbers'
    | 'editorWordWrap'
    | 'editorShowToolbar',
  value: boolean,
) {
  if (key === 'markdownPreviewDefault') markdownPreviewDefault.value = value;
  if (key === 'editorLineNumbers') editorLineNumbers.value = value;
  if (key === 'editorWordWrap') editorWordWrap.value = value;
  if (key === 'editorShowToolbar') editorShowToolbar.value = value;
  await applyImmediate({ [key]: value });
}

async function onSave() {
  let size = Number(editorFontSize.value);
  if (!Number.isFinite(size)) size = settings.value.editorFontSize;
  size = Math.min(EDITOR_FONT_SIZE_MAX, Math.max(EDITOR_FONT_SIZE_MIN, Math.round(size)));
  editorFontSize.value = String(size);

  await settingsStore.updatePreferences({
    editorViewMode: editorViewMode.value,
    markdownPreviewDefault: markdownPreviewDefault.value,
    editorFontSize: size,
    editorFontFamily: editorFontFamily.value || DEFAULT_SETTINGS.editorFontFamily,
    editorLineNumbers: editorLineNumbers.value,
    editorWordWrap: editorWordWrap.value,
    editorShowToolbar: editorShowToolbar.value,
  });
  toast.show(t('options.saved'));
}
</script>

<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-lg font-bold text-pn-text">{{ t('options.editorPrefsSection') }}</h2>
      <p class="mt-1 text-sm text-pn-text-sub">{{ t('options.editorPrefsHint') }}</p>
    </div>

    <div class="rounded-[12px] border border-pn-border bg-pn-bg p-4">
      <div class="text-sm font-medium text-pn-text">{{ t('options.editorViewMode') }}</div>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="mode in (['edit', 'preview', 'split'] as EditorViewMode[])"
          :key="mode"
          type="button"
          class="rounded-[8px] border px-3 py-1.5 text-sm transition"
          :class="
            editorViewMode === mode
              ? 'border-pn-accent bg-pn-accent-soft font-medium text-pn-accent'
              : 'border-pn-border text-pn-text-sub hover:border-pn-accent/40'
          "
          @click="onViewModeChange(mode)"
        >
          {{ t(`options.editorMode.${mode}`) }}
        </button>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <label class="flex items-start gap-3 rounded-[12px] border border-pn-border bg-pn-bg p-4 text-sm">
        <input
          type="checkbox"
          class="mt-0.5"
          :checked="markdownPreviewDefault"
          @change="onToggle('markdownPreviewDefault', ($event.target as HTMLInputElement).checked)"
        />
        <span>
          <span class="font-medium text-pn-text">{{ t('options.markdownPreviewDefault') }}</span>
          <span class="mt-0.5 block text-xs text-pn-text-sub">{{ t('options.markdownPreviewHint') }}</span>
        </span>
      </label>

      <label class="flex items-start gap-3 rounded-[12px] border border-pn-border bg-pn-bg p-4 text-sm">
        <input
          type="checkbox"
          class="mt-0.5"
          :checked="editorLineNumbers"
          @change="onToggle('editorLineNumbers', ($event.target as HTMLInputElement).checked)"
        />
        <span class="font-medium text-pn-text">{{ t('options.editorLineNumbers') }}</span>
      </label>

      <label class="flex items-start gap-3 rounded-[12px] border border-pn-border bg-pn-bg p-4 text-sm">
        <input
          type="checkbox"
          class="mt-0.5"
          :checked="editorWordWrap"
          @change="onToggle('editorWordWrap', ($event.target as HTMLInputElement).checked)"
        />
        <span class="font-medium text-pn-text">{{ t('options.editorWordWrap') }}</span>
      </label>

      <label class="flex items-start gap-3 rounded-[12px] border border-pn-border bg-pn-bg p-4 text-sm">
        <input
          type="checkbox"
          class="mt-0.5"
          :checked="editorShowToolbar"
          @change="onToggle('editorShowToolbar', ($event.target as HTMLInputElement).checked)"
        />
        <span class="font-medium text-pn-text">{{ t('options.editorShowToolbar') }}</span>
      </label>
    </div>

    <div class="grid gap-4 rounded-[12px] border border-pn-border bg-pn-bg p-4 sm:grid-cols-2">
      <label class="block space-y-1.5">
        <span class="text-sm text-pn-text-sub">{{ t('options.editorFontSize') }}</span>
        <PnInput v-model="editorFontSize" type="number" />
        <span class="text-xs text-pn-text-sub">
          {{ t('options.editorFontSizeHint', { min: EDITOR_FONT_SIZE_MIN, max: EDITOR_FONT_SIZE_MAX }) }}
        </span>
      </label>

      <label class="block space-y-1.5">
        <span class="text-sm text-pn-text-sub">{{ t('options.editorFontFamily') }}</span>
        <select
          v-model="editorFontFamily"
          class="pn-focus-ring w-full rounded-[8px] border border-pn-border bg-pn-bg px-3 py-2 text-sm text-pn-text"
        >
          <option v-for="preset in fontPresets" :key="preset.value" :value="preset.value">
            {{ t(preset.labelKey) }}
          </option>
        </select>
      </label>
    </div>

    <PnButton variant="primary" @click="onSave">{{ t('common.save') }}</PnButton>
  </section>
</template>
