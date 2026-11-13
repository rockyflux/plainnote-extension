<script lang="ts" setup>
withDefaults(
  defineProps<{
    padded?: boolean;
    title?: string;
  }>(),
  {
    padded: true,
  },
);
</script>

<template>
  <section
    class="rounded-[8px] border border-pn-border bg-pn-bg"
    :class="padded ? 'p-4' : ''"
  >
    <h2 v-if="title" class="mb-3 text-sm font-semibold text-pn-text">{{ title }}</h2>
    <slot />
  </section>
</template>
