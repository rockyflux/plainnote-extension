<script lang="ts" setup>
/**
 * Compatibility wrapper — prefer SaveSuccessView for new popup UI.
 */
import { computed, onMounted } from 'vue';
import type { LocalNote } from '@/types';
import SaveSuccessView from '@/components/popup/SaveSuccessView.vue';
import { useServicesStore } from '@/stores/services';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  note: LocalNote;
}>();

const emit = defineEmits<{
  again: [];
  openSidePanel: [];
  openEditor: [];
  openWorkbench: [];
}>();

const { t } = useI18n();
const servicesStore = useServicesStore();
const { items } = storeToRefs(servicesStore);

onMounted(() => {
  void servicesStore.refresh();
});

const serviceName = computed(() => {
  return items.value.find((s) => s.id === props.note.serviceId)?.name ?? t('workbench.defaultService');
});

function onOpenNote() {
  emit('openEditor');
}
</script>

<template>
  <SaveSuccessView
    :note="note"
    :service-name="serviceName"
    @again="emit('again')"
    @open-note="onOpenNote"
    @open-workbench="emit('openWorkbench')"
  />
</template>
