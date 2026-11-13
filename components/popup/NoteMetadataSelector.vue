<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import WorkbenchIcon from '@/components/workbench/WorkbenchIcon.vue';
import { useOrganizationStore } from '@/stores/organization';
import { useServicesStore } from '@/stores/services';

const props = defineProps<{
  serviceId: string;
  folderId: number | null;
  tagIds: number[];
  showTagPicker?: boolean;
}>();

const emit = defineEmits<{
  'update:serviceId': [value: string];
  'update:folderId': [value: number | null];
  'update:tagIds': [value: number[]];
  'update:showTagPicker': [value: boolean];
  removeTag: [id: number];
}>();

const { t } = useI18n();
const org = useOrganizationStore();
const servicesStore = useServicesStore();
const { folders, tags } = storeToRefs(org);
const { items: services } = storeToRefs(servicesStore);

const newTagName = ref('');
const creatingTag = ref(false);

const selectedTags = computed(() =>
  tags.value.filter((tg) => tg.id != null && props.tagIds.includes(tg.id)),
);

onMounted(() => {
  void org.refresh();
  void servicesStore.refresh();
});

function onServiceChange(e: Event) {
  emit('update:serviceId', (e.target as HTMLSelectElement).value);
}

function onFolderChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value;
  emit('update:folderId', v ? Number(v) : null);
}

function toggleTag(id: number) {
  const next = new Set(props.tagIds);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  emit('update:tagIds', [...next]);
}

async function addTag() {
  const name = newTagName.value.trim();
  if (!name) return;
  creatingTag.value = true;
  try {
    const id = await org.createTag(name);
    newTagName.value = '';
    emit('update:tagIds', [...props.tagIds, id]);
  } finally {
    creatingTag.value = false;
  }
}
</script>

<template>
  <div class="space-y-2.5">
    <div class="grid grid-cols-2 gap-2">
      <label class="relative block">
        <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-pn-text-sub">
          <WorkbenchIcon name="cloud" :size="14" />
        </span>
        <select
          class="pn-focus-ring w-full appearance-none truncate rounded-[8px] border border-pn-border bg-pn-bg py-2 pl-8 pr-7 text-xs text-pn-text"
          :value="serviceId"
          :aria-label="t('services.selectLabel')"
          @change="onServiceChange"
        >
          <option v-for="service in services" :key="service.id" :value="service.id">
            {{ service.name }}
          </option>
        </select>
        <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-pn-text-muted">
          <WorkbenchIcon name="chevronDown" :size="12" />
        </span>
      </label>

      <label class="relative block">
        <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-pn-text-sub">
          <WorkbenchIcon name="folder" :size="14" />
        </span>
        <select
          class="pn-focus-ring w-full appearance-none truncate rounded-[8px] border border-pn-border bg-pn-bg py-2 pl-8 pr-7 text-xs text-pn-text"
          :value="folderId ?? ''"
          :aria-label="t('organization.folder')"
          @change="onFolderChange"
        >
          <option value="">{{ t('organization.noFolder') }}</option>
          <option v-for="folder in folders" :key="folder.id" :value="folder.id">
            {{ folder.name }}
          </option>
        </select>
        <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-pn-text-muted">
          <WorkbenchIcon name="chevronDown" :size="12" />
        </span>
      </label>
    </div>

    <div class="flex flex-wrap items-center gap-1.5">
      <span class="text-pn-text-sub" aria-hidden="true">
        <WorkbenchIcon name="tag" :size="14" />
      </span>
      <span
        v-for="tg in selectedTags"
        :key="tg.id"
        class="inline-flex items-center gap-1 rounded-full bg-pn-accent-soft px-2.5 py-1 text-xs font-medium text-pn-accent"
      >
        {{ tg.name }}
        <button
          type="button"
          class="opacity-70 hover:opacity-100"
          :aria-label="t('common.delete')"
          @click="emit('removeTag', tg.id!)"
        >
          ×
        </button>
      </span>
      <button
        type="button"
        class="rounded-full border border-dashed border-pn-border px-2.5 py-1 text-xs text-pn-text-sub hover:border-pn-accent hover:text-pn-accent"
        @click="emit('update:showTagPicker', !showTagPicker)"
      >
        {{ t('popup.addTag') }}
      </button>
    </div>

    <div
      v-if="showTagPicker"
      class="space-y-2 rounded-[8px] border border-pn-border bg-pn-bg-sub p-2.5"
    >
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="tag in tags"
          :key="tag.id"
          type="button"
          class="rounded-[8px] border px-2 py-1 text-xs transition-colors"
          :class="
            tag.id != null && tagIds.includes(tag.id)
              ? 'border-pn-accent bg-pn-accent-soft text-pn-accent'
              : 'border-pn-border bg-pn-bg text-pn-text-sub hover:bg-pn-bg'
          "
          @click="tag.id != null && toggleTag(tag.id)"
        >
          {{ tag.name }}
        </button>
        <span v-if="tags.length === 0" class="text-xs text-pn-text-sub">
          {{ t('organization.noTags') }}
        </span>
      </div>
      <div class="flex items-center gap-1">
        <input
          v-model="newTagName"
          type="text"
          class="pn-focus-ring min-w-0 flex-1 rounded-[6px] border border-pn-border bg-pn-bg px-2 py-1 text-[11px] text-pn-text placeholder:text-[#c0c5cc]"
          :placeholder="t('organization.newTagPlaceholder')"
          @keydown.enter.prevent="addTag"
        />
        <button
          type="button"
          class="shrink-0 rounded-[6px] border border-pn-border bg-pn-bg px-2 py-1 text-[11px] font-medium text-pn-text hover:bg-pn-bg disabled:opacity-50"
          :disabled="creatingTag"
          @click="addTag"
        >
          {{ t('organization.add') }}
        </button>
      </div>
    </div>
  </div>
</template>
