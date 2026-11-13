<script lang="ts" setup>
defineProps<{
  modelValue: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
  <div class="relative">
    <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-pn-text-sub">
      ⌕
    </span>
    <input
      :value="modelValue"
      type="search"
      :placeholder="placeholder"
      class="pn-focus-ring w-full rounded-[8px] border border-pn-border bg-pn-bg py-2 pl-8 pr-3 text-sm text-pn-text placeholder:text-[#c0c5cc]"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
