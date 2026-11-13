<script lang="ts" setup>
withDefaults(
  defineProps<{
    widthClass?: string;
    /** Fill the viewport (detached popup window). */
    fillViewport?: boolean;
  }>(),
  {
    widthClass: 'w-full',
    fillViewport: false,
  },
);
</script>

<template>
  <div
    class="bg-pn-bg text-pn-text"
    :class="[
      widthClass,
      fillViewport ? 'flex h-full min-h-0 flex-col overflow-hidden' : 'min-h-full',
    ]"
  >
    <slot />
  </div>
</template>
