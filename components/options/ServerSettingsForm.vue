<script lang="ts" setup>
/**
 * Legacy single-URL form replaced by ServiceManager.
 * Kept as a thin re-export wrapper so older imports keep working.
 */
import ServiceManager from '@/components/options/ServiceManager.vue';
</script>

<template>
  <ServiceManager />
</template>
