<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import type { NoteFormat } from '@/types';
import PnButton from '@/components/ui/PnButton.vue';
import PnFormatToggle from '@/components/ui/PnFormatToggle.vue';
import FolderSelect from '@/components/organization/FolderSelect.vue';
import TagSelect from '@/components/organization/TagSelect.vue';
import ServiceSelect from '@/components/services/ServiceSelect.vue';
import { useSettingsStore } from '@/stores/settings';
import { useServicesStore } from '@/stores/services';
import { useOrganizationStore } from '@/stores/organization';
import { useToast } from '@/composables/useToast';
import {
  AUTO_SAVE_INTERVAL_MAX_MS,
  AUTO_SAVE_INTERVAL_MIN_MS,
} from '@/utils/constants';
import PnInput from '@/components/ui/PnInput.vue';

const { t } = useI18n();
const toast = useToast();
const settingsStore = useSettingsStore();
const servicesStore = useServicesStore();
const orgStore = useOrganizationStore();
const { settings } = storeToRefs(settingsStore);

const defaultFormat = ref<NoteFormat>(settings.value.defaultFormat);
const defaultFolderId = ref<number | null>(settings.value.defaultFolderId);
const defaultTagIds = ref<number[]>([...settings.value.defaultTagIds]);
const defaultServiceId = ref(settings.value.defaultServiceId);
const autoSaveEnabled = ref(settings.value.autoSaveEnabled);
const autoSaveIntervalMs = ref(String(settings.value.autoSaveIntervalMs));
const copyPublicLinkOnCreate = ref(settings.value.copyPublicLinkOnCreate);
const openEditorOnCreate = ref(settings.value.openEditorOnCreate);

watch(
  () => settings.value,
  (value) => {
    defaultFormat.value = value.defaultFormat;
    defaultFolderId.value = value.defaultFolderId;
    defaultTagIds.value = [...value.defaultTagIds];
    defaultServiceId.value = value.defaultServiceId;
    autoSaveEnabled.value = value.autoSaveEnabled;
    autoSaveIntervalMs.value = String(value.autoSaveIntervalMs);
    copyPublicLinkOnCreate.value = value.copyPublicLinkOnCreate;
    openEditorOnCreate.value = value.openEditorOnCreate;
  },
  { deep: true },
);

onMounted(() => {
  void orgStore.ensureDefaults();
});

async function onSave() {
  let interval = Number(autoSaveIntervalMs.value);
  if (!Number.isFinite(interval)) interval = settings.value.autoSaveIntervalMs;
  interval = Math.min(
    AUTO_SAVE_INTERVAL_MAX_MS,
    Math.max(AUTO_SAVE_INTERVAL_MIN_MS, Math.round(interval)),
  );
  autoSaveIntervalMs.value = String(interval);

  if (defaultServiceId.value && defaultServiceId.value !== settings.value.defaultServiceId) {
    await servicesStore.setDefault(defaultServiceId.value);
  }

  await settingsStore.updatePreferences({
    defaultFormat: defaultFormat.value,
    defaultFolderId: defaultFolderId.value,
    defaultTagIds: [...defaultTagIds.value],
    defaultServiceId: defaultServiceId.value,
    autoSaveEnabled: autoSaveEnabled.value,
    autoSaveIntervalMs: interval,
    copyPublicLinkOnCreate: copyPublicLinkOnCreate.value,
    openEditorOnCreate: openEditorOnCreate.value,
  });
  toast.show(t('options.saved'));
}
</script>

<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-lg font-bold text-pn-text">{{ t('options.defaultsSection') }}</h2>
      <p class="mt-1 text-sm text-pn-text-sub">{{ t('options.defaultsHint') }}</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div class="rounded-[12px] border border-pn-border bg-pn-bg p-4">
        <div class="text-sm font-medium text-pn-text">{{ t('options.defaultFormat') }}</div>
        <div class="mt-3">
          <PnFormatToggle v-model="defaultFormat" />
        </div>
      </div>

      <div class="rounded-[12px] border border-pn-border bg-pn-bg p-4">
        <div class="text-sm font-medium text-pn-text">{{ t('options.defaultFolder') }}</div>
        <div class="mt-3">
          <FolderSelect v-model="defaultFolderId" />
        </div>
      </div>

      <div class="rounded-[12px] border border-pn-border bg-pn-bg p-4">
        <div class="text-sm font-medium text-pn-text">{{ t('options.defaultService') }}</div>
        <p class="mt-1 text-xs text-pn-text-sub">{{ t('options.defaultServiceHint') }}</p>
        <div class="mt-3">
          <ServiceSelect v-model="defaultServiceId" />
        </div>
      </div>

      <div class="rounded-[12px] border border-pn-border bg-pn-bg p-4">
        <div class="text-sm font-medium text-pn-text">{{ t('options.defaultTags') }}</div>
        <div class="mt-3">
          <TagSelect v-model="defaultTagIds" />
        </div>
      </div>
    </div>

    <div class="space-y-3 rounded-[12px] border border-pn-border bg-pn-bg p-4">
      <label class="flex items-start gap-3 text-sm text-pn-text">
        <input v-model="autoSaveEnabled" type="checkbox" class="mt-0.5" />
        <span>
          <span class="font-medium">{{ t('options.autoSaveEnabled') }}</span>
          <span class="mt-0.5 block text-xs text-pn-text-sub">{{ t('options.autoSaveHint') }}</span>
        </span>
      </label>

      <label class="block space-y-1.5 pl-7" :class="{ 'opacity-50': !autoSaveEnabled }">
        <span class="text-sm text-pn-text-sub">{{ t('options.autoSaveInterval') }}</span>
        <PnInput
          v-model="autoSaveIntervalMs"
          type="number"
          :disabled="!autoSaveEnabled"
        />
        <span class="text-xs text-pn-text-sub">
          {{ t('options.autoSaveIntervalHint', { min: AUTO_SAVE_INTERVAL_MIN_MS, max: AUTO_SAVE_INTERVAL_MAX_MS }) }}
        </span>
      </label>

      <label class="flex items-start gap-3 text-sm text-pn-text">
        <input v-model="copyPublicLinkOnCreate" type="checkbox" class="mt-0.5" />
        <span>
          <span class="font-medium">{{ t('options.copyPublicLinkOnCreate') }}</span>
          <span class="mt-0.5 block text-xs text-pn-text-sub">{{
            t('options.copyPublicLinkOnCreateHint')
          }}</span>
        </span>
      </label>

      <label class="flex items-start gap-3 text-sm text-pn-text">
        <input v-model="openEditorOnCreate" type="checkbox" class="mt-0.5" />
        <span>
          <span class="font-medium">{{ t('options.openEditorOnCreate') }}</span>
          <span class="mt-0.5 block text-xs text-pn-text-sub">{{
            t('options.openEditorOnCreateHint')
          }}</span>
        </span>
      </label>
    </div>

    <PnButton variant="primary" @click="onSave">{{ t('common.save') }}</PnButton>
  </section>
</template>
