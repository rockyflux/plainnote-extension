<script lang="ts" setup>
withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    rows?: number;
    disabled?: boolean;
  }>(),
  {
    placeholder: '',
    rows: 6,
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
  <textarea
    :value="modelValue"
    :placeholder="placeholder"
    :rows="rows"
    :disabled="disabled"
    class="pn-focus-ring w-full resize-y rounded-[8px] border border-pn-border bg-pn-bg px-3 py-2 text-sm leading-relaxed text-pn-text placeholder:text-[#c0c5cc] disabled:bg-pn-bg-sub"
    @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
