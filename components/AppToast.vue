<script lang="ts" setup>
defineProps<{
  message: string;
  visible?: boolean;
}>();
</script>

<template>
  <div
    v-if="visible && message"
    class="fixed bottom-4 left-1/2 z-50 max-w-[90%] -translate-x-1/2 rounded-[8px] border border-pn-border bg-pn-text px-3 py-2 text-sm text-white"
    role="status"
  >
    {{ message }}
  </div>
</template>
