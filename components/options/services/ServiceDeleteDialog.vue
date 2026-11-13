<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDialog from '@/components/AppDialog.vue';

const props = defineProps<{
  open: boolean;
  noteCount: number;
  isLastService: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const { t } = useI18n();

const blocked = computed(() => props.noteCount > 0 || props.isLastService);

const body = computed(() => {
  if (props.isLastService) return t('options.deleteLastServiceBody');
  if (props.noteCount > 0) {
    return t('options.deleteServiceBlockedBody', { count: props.noteCount });
  }
  return t('options.deleteServiceBody');
});

const confirmLabel = computed(() =>
  blocked.value ? t('common.close') : t('common.delete'),
);

function onConfirm() {
  if (blocked.value) {
    emit('cancel');
    return;
  }
  emit('confirm');
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="t('options.deleteServiceTitle')"
    :body="body"
    :confirm-label="confirmLabel"
    :confirm-variant="blocked ? 'primary' : 'danger'"
    @cancel="emit('cancel')"
    @confirm="onConfirm"
  />
</template>
