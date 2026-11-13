<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import PnButton from '@/components/ui/PnButton.vue';

defineProps<{
  copyPublicOnSave: boolean;
  busy?: boolean;
  showCopyOption?: boolean;
  modKey?: string;
}>();

const emit = defineEmits<{
  'update:copyPublicOnSave': [value: boolean];
  cancel: [];
  save: [];
}>();

const { t } = useI18n();
</script>

<template>
  <footer class="flex items-center justify-between gap-2 border-t border-pn-border px-4 py-3">
    <label
      v-if="showCopyOption !== false"
      class="flex min-w-0 cursor-pointer items-center gap-2 text-[12px] text-pn-text-sub"
    >
      <input
        type="checkbox"
        class="rounded border-pn-border text-pn-accent focus:ring-pn-accent"
        :checked="copyPublicOnSave"
        @change="emit('update:copyPublicOnSave', ($event.target as HTMLInputElement).checked)"
      />
      <span class="truncate">{{ t('popup.copyPublicAfterSave') }}</span>
    </label>
    <div v-else class="flex-1" />

    <div class="flex shrink-0 gap-2">
      <PnButton variant="secondary" size="sm" @click="emit('cancel')">
        {{ t('common.cancel') }}
      </PnButton>
      <PnButton variant="primary" size="sm" :disabled="busy" @click="emit('save')">
        {{
          busy
            ? t('loading.saving')
            : t('popup.saveWithShortcut', { mod: modKey || 'Ctrl' })
        }}
      </PnButton>
    </div>
  </footer>
</template>
