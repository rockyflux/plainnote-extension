<script lang="ts" setup>
/**
 * @deprecated Prefer SharePanel — kept as a thin alias for older call sites.
 */
import type { LocalNote } from '@/types';
import SharePanel from '@/components/share/SharePanel.vue';

defineProps<{
  note: LocalNote;
}>();
</script>

<template>
  <SharePanel :note="note" />
</template>
