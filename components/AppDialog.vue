<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import PnButton from '@/components/ui/PnButton.vue';

withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    body: string;
    confirmLabel?: string;
    confirmDisabled?: boolean;
    confirmVariant?: 'danger' | 'primary';
  }>(),
  {
    confirmDisabled: false,
    confirmVariant: 'danger',
  },
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    role="dialog"
    aria-modal="true"
  >
    <div class="w-full max-w-sm space-y-4 rounded-[8px] border border-pn-border bg-pn-bg p-4">
      <h2 class="text-base font-semibold text-pn-text">{{ title }}</h2>
      <p class="text-sm text-pn-text-sub whitespace-pre-wrap">{{ body }}</p>
      <slot />
      <div class="flex justify-end gap-2">
        <PnButton variant="secondary" @click="emit('cancel')">
          {{ t('dialog.cancel') }}
        </PnButton>
        <PnButton
          :variant="confirmVariant"
          :disabled="confirmDisabled"
          @click="emit('confirm')"
        >
          {{ confirmLabel || t('dialog.confirmDelete') }}
        </PnButton>
      </div>
    </div>
  </div>
</template>
