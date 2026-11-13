<script lang="ts" setup>
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
    <p class="text-sm font-medium text-pn-text">{{ title }}</p>
    <p v-if="description" class="text-xs text-pn-text-sub">{{ description }}</p>
    <div v-if="$slots.action" class="mt-3">
      <slot name="action" />
    </div>
  </div>
</template>
