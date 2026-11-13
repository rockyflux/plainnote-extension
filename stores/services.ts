import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ServiceConnectionResult, ServiceInput, ServiceRecord } from '@/types';
import { servicesService } from '@/services/services-service';
import { useSettingsStore } from '@/stores/settings';

export const useServicesStore = defineStore('services', () => {
  const items = ref<ServiceRecord[]>([]);
  const loading = ref(false);
  const testingId = ref<string | null>(null);
  const lastTest = ref<ServiceConnectionResult | null>(null);

  const defaultService = computed(
    () => items.value.find((s) => s.isDefault) ?? items.value[0] ?? null,
  );

  async function refresh() {
    loading.value = true;
    try {
      items.value = await servicesService.list();
    } finally {
      loading.value = false;
    }
  }

  async function create(input: ServiceInput & { makeDefault?: boolean }) {
    const created = await servicesService.create(input);
    await refresh();
    const settings = useSettingsStore();
    if (input.makeDefault) {
      await settings.setDefaultServiceId(created.id);
    }
    return created;
  }

  async function update(id: string, input: Partial<ServiceInput>) {
    await servicesService.update(id, input);
    await refresh();
  }

  async function remove(id: string) {
    await servicesService.remove(id);
    await refresh();
    const settings = useSettingsStore();
    await settings.hydrate();
  }

  async function setDefault(id: string) {
    await servicesService.setDefault(id);
    await refresh();
    const settings = useSettingsStore();
    await settings.setDefaultServiceId(id);
  }

  async function test(idOrUrl: string) {
    testingId.value = idOrUrl;
    try {
      lastTest.value = await servicesService.testConnection(idOrUrl);
      await refresh();
      return lastTest.value;
    } finally {
      testingId.value = null;
    }
  }

  async function noteCount(id: string) {
    return servicesService.noteCount(id);
  }

  return {
    items,
    loading,
    testingId,
    lastTest,
    defaultService,
    refresh,
    create,
    update,
    remove,
    setDefault,
    test,
    noteCount,
  };
});
