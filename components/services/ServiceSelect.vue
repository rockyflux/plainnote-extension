<script lang="ts" setup>
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useServicesStore } from '@/stores/services';
import { useSettingsStore } from '@/stores/settings';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const servicesStore = useServicesStore();
const settingsStore = useSettingsStore();
const { items } = storeToRefs(servicesStore);
const { settings } = storeToRefs(settingsStore);

onMounted(async () => {
  if (items.value.length === 0) {
    await servicesStore.refresh();
  }
  if (!props.modelValue) {
    emit(
      'update:modelValue',
      settings.value.defaultServiceId || items.value.find((s) => s.isDefault)?.id || '',
    );
  }
});
</script>

<template>
  <label class="block space-y-1.5">
    <span class="text-xs font-medium text-pn-text-sub">{{ $t('services.selectLabel') }}</span>
    <select
      class="pn-focus-ring w-full rounded-[8px] border border-pn-border bg-pn-bg px-3 py-2 text-sm text-pn-text"
      :value="modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="service in items" :key="service.id" :value="service.id">
        {{ service.name }}
        {{ service.isDefault ? `(${$t('options.defaultBadge')})` : '' }}
      </option>
    </select>
  </label>
</template>
