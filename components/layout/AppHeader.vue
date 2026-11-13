<script lang="ts" setup>
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <header class="flex items-start justify-between gap-3 border-b border-pn-border px-4 py-3">
    <div class="min-w-0">
      <h1 class="truncate text-[15px] font-bold text-pn-text">{{ title }}</h1>
      <p v-if="subtitle" class="mt-0.5 text-xs text-pn-text-sub">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-1.5">
      <slot name="actions" />
    </div>
  </header>
</template>
