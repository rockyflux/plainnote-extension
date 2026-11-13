<script lang="ts" setup>
import { onMounted } from 'vue';
import AppShell from '@/components/layout/AppShell.vue';
import AppToast from '@/components/AppToast.vue';
import QuickNoteForm from '@/components/popup/QuickNoteForm.vue';
import { useToast } from '@/composables/useToast';
import { STORAGE_KEYS } from '@/utils/constants';
import { openWorkbenchTab } from '@/utils/open-workbench';
import { openOptionsPage } from '@/utils/open-options';
import { isDetachedPopup, openDetachedPopup } from '@/utils/open-popup';

const { message: toastMessage, visible: toastVisible } = useToast();
const detached = isDetachedPopup();

onMounted(() => {
  if (detached) {
    document.documentElement.classList.add('pn-popup-detached');
  }
});

async function openSidePanel() {
  const current = await browser.windows.getCurrent();
  if (current.id != null && browser.sidePanel?.open) {
    await browser.sidePanel.open({ windowId: current.id });
  }
}

async function openOptions() {
  await openOptionsPage();
  window.close();
}

async function openWorkbench() {
  await openWorkbenchTab();
  window.close();
}

async function openEditor(localId: number) {
  await browser.storage.session.remove([
    STORAGE_KEYS.pendingClip,
    STORAGE_KEYS.pendingQuickCapture,
    STORAGE_KEYS.pendingDetachOpen,
  ]);
  await openWorkbenchTab(localId);
  window.close();
}

async function detachPopup() {
  await openDetachedPopup();
  window.close();
}

function closePopup() {
  window.close();
}
</script>

<template>
  <AppShell
    :width-class="detached ? 'w-full text-[15px]' : 'w-[440px] text-[15px]'"
    :fill-viewport="detached"
  >
    <QuickNoteForm
      class="min-h-0 flex-1"
      @open-side-panel="openSidePanel"
      @open-options="openOptions"
      @open-editor="openEditor"
      @open-workbench="openWorkbench"
      @detach="detachPopup"
      @close="closePopup"
    />
    <AppToast :message="toastMessage" :visible="toastVisible" />
  </AppShell>
</template>
