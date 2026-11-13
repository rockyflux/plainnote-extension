<script lang="ts" setup>
withDefaults(
  defineProps<{
    modelValue: string;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
  }>(),
  {
    type: 'text',
    placeholder: '',
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
  <input
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    class="pn-focus-ring w-full rounded-[8px] border border-pn-border bg-pn-bg px-3 py-2 text-sm text-pn-text placeholder:text-[#c0c5cc] disabled:bg-pn-bg-sub"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
