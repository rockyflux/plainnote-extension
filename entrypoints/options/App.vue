<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import AppShell from '@/components/layout/AppShell.vue';
import AppToast from '@/components/AppToast.vue';
import SettingsPanel, {
  type SettingsSection,
} from '@/components/options/SettingsPanel.vue';
import { useToast } from '@/composables/useToast';

const { message: toastMessage, visible: toastVisible } = useToast();

function sectionFromHash(): SettingsSection | 'all' {
  const raw = window.location.hash.replace(/^#/, '').trim();
  if (
    raw === 'services' ||
    raw === 'general' ||
    raw === 'editor' ||
    raw === 'shortcuts' ||
    raw === 'data' ||
    raw === 'appearance' ||
    raw === 'about'
  ) {
    return raw;
  }
  if (raw === 'backup') return 'data';
  return 'all';
}

const focusSection = ref<SettingsSection | 'all'>(sectionFromHash());

function onHashChange() {
  focusSection.value = sectionFromHash();
}

onMounted(() => {
  window.addEventListener('hashchange', onHashChange);
});

onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange);
});

const panelKey = computed(() => String(focusSection.value));
</script>

<template>
  <AppShell>
    <div class="flex min-h-screen flex-col bg-pn-bg-sub">
      <SettingsPanel :key="panelKey" class="min-h-screen flex-1" :focus-section="focusSection" />
    </div>
    <AppToast :message="toastMessage" :visible="toastVisible" />
  </AppShell>
</template>
