<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import PnButton from '@/components/ui/PnButton.vue';
import PnInput from '@/components/ui/PnInput.vue';
import { useOrganizationStore } from '@/stores/organization';

defineProps<{
  modelValue: number | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number | null];
}>();

const { t } = useI18n();
const org = useOrganizationStore();
const { folders } = storeToRefs(org);
const newName = ref('');
const creating = ref(false);

onMounted(() => {
  void org.refresh();
});

async function addFolder() {
  const name = newName.value.trim();
  if (!name) return;
  creating.value = true;
  try {
    const id = await org.createFolder(name);
    newName.value = '';
    emit('update:modelValue', id);
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="space-y-1.5">
    <label class="block space-y-1.5">
      <span class="text-xs font-medium text-pn-text-sub">{{ t('organization.folder') }}</span>
      <select
        class="pn-focus-ring w-full rounded-[8px] border border-pn-border bg-pn-bg px-3 py-2 text-sm"
        :value="modelValue ?? ''"
        @change="
          emit(
            'update:modelValue',
            ($event.target as HTMLSelectElement).value
              ? Number(($event.target as HTMLSelectElement).value)
              : null,
          )
        "
      >
        <option value="">{{ t('organization.noFolder') }}</option>
        <option v-for="folder in folders" :key="folder.id" :value="folder.id">
          {{ folder.name }}
        </option>
      </select>
    </label>
    <div class="flex gap-1.5">
      <PnInput
        v-model="newName"
        :placeholder="t('organization.newFolderPlaceholder')"
        class="flex-1"
      />
      <PnButton variant="secondary" size="sm" :disabled="creating" @click="addFolder">
        {{ t('organization.add') }}
      </PnButton>
    </div>
  </div>
</template>
