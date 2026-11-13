<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import type { NoteFormat } from '@/types';
import WorkbenchIcon from '@/components/workbench/WorkbenchIcon.vue';

defineProps<{
  modelValue: NoteFormat;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: NoteFormat];
}>();

const { t } = useI18n();
</script>

<template>
  <div
    class="inline-flex w-full rounded-[10px] border border-pn-border bg-pn-bg-sub p-0.5"
    role="group"
    :aria-label="t('popup.formatSwitcher')"
  >
    <button
      type="button"
      class="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors"
      :class="
        modelValue === 'markdown'
          ? 'bg-white text-pn-accent shadow-sm'
          : 'text-pn-text-sub hover:text-pn-text'
      "
      @click="emit('update:modelValue', 'markdown')"
    >
      <WorkbenchIcon name="markdown" :size="14" />
      {{ t('editor.formatMarkdown') }}
    </button>
    <button
      type="button"
      class="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors"
      :class="
        modelValue === 'text'
          ? 'bg-white text-pn-accent shadow-sm'
          : 'text-pn-text-sub hover:text-pn-text'
      "
      @click="emit('update:modelValue', 'text')"
    >
      <WorkbenchIcon name="text" :size="14" />
      {{ t('editor.formatText') }}
    </button>
  </div>
</template>
