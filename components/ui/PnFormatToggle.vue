<script lang="ts" setup>
import type { NoteFormat } from '@/types';

defineProps<{
  modelValue: NoteFormat;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: NoteFormat];
}>();
</script>

<template>
  <div
    class="inline-flex rounded-[8px] border border-pn-border bg-pn-bg-sub p-0.5"
    role="group"
  >
    <button
      type="button"
      class="rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors"
      :class="
        modelValue === 'text'
          ? 'bg-pn-accent text-white shadow-sm'
          : 'text-pn-text-sub hover:text-pn-text'
      "
      @click="emit('update:modelValue', 'text')"
    >
      Text
    </button>
    <button
      type="button"
      class="rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors"
      :class="
        modelValue === 'markdown'
          ? 'bg-pn-accent text-white shadow-sm'
          : 'text-pn-text-sub hover:text-pn-text'
      "
      @click="emit('update:modelValue', 'markdown')"
    >
      Markdown
    </button>
  </div>
</template>
