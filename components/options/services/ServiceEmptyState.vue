<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import PnButton from '@/components/ui/PnButton.vue';
import PnEmpty from '@/components/ui/PnEmpty.vue';

defineEmits<{
  add: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="rounded-[12px] border border-dashed border-pn-border bg-pn-bg px-4 py-8">
    <PnEmpty
      :title="t('options.emptyServicesTitle')"
      :description="t('options.emptyServicesDesc')"
    >
      <template #action>
        <PnButton variant="primary" size="sm" @click="$emit('add')">
          + {{ t('options.addService') }}
        </PnButton>
      </template>
    </PnEmpty>
  </div>
</template>
