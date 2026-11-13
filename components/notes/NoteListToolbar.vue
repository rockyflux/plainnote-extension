<script lang="ts" setup>
import type { NoteSortKey } from '@/utils/note-filters';
import PnSearchInput from '@/components/ui/PnSearchInput.vue';
import PnButton from '@/components/ui/PnButton.vue';

defineProps<{
  query: string;
  sort: NoteSortKey;
  selectMode: boolean;
  selectedCount: number;
}>();

const emit = defineEmits<{
  'update:query': [value: string];
  'update:sort': [value: NoteSortKey];
  'update:selectMode': [value: boolean];
  batchFavorite: [];
  batchMove: [];
  batchTags: [];
}>();

const sortOptions: { value: NoteSortKey; labelKey: string }[] = [
  { value: 'updatedDesc', labelKey: 'sidePanel.sortUpdatedDesc' },
  { value: 'updatedAsc', labelKey: 'sidePanel.sortUpdatedAsc' },
  { value: 'openedDesc', labelKey: 'sidePanel.sortOpenedDesc' },
  { value: 'titleAsc', labelKey: 'sidePanel.sortTitleAsc' },
];
</script>

<template>
  <div class="space-y-2">
    <PnSearchInput
      :model-value="query"
      :placeholder="$t('sidePanel.searchPlaceholder')"
      @update:model-value="emit('update:query', $event)"
    />
    <div class="flex flex-wrap items-center gap-2">
      <select
        class="pn-focus-ring min-w-0 flex-1 rounded-[8px] border border-pn-border bg-pn-bg px-2 py-1.5 text-xs"
        :value="sort"
        @change="emit('update:sort', ($event.target as HTMLSelectElement).value as NoteSortKey)"
      >
        <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
          {{ $t(opt.labelKey) }}
        </option>
      </select>
      <PnButton
        variant="secondary"
        size="sm"
        @click="emit('update:selectMode', !selectMode)"
      >
        {{ selectMode ? $t('sidePanel.cancelSelect') : $t('sidePanel.selectMode') }}
      </PnButton>
    </div>
    <div v-if="selectMode" class="flex flex-wrap gap-1.5">
      <span class="w-full text-[11px] text-pn-text-sub">
        {{ $t('sidePanel.selectedCount', { n: selectedCount }) }}
      </span>
      <PnButton variant="secondary" size="sm" :disabled="!selectedCount" @click="emit('batchFavorite')">
        {{ $t('sidePanel.batchFavorite') }}
      </PnButton>
      <PnButton variant="secondary" size="sm" :disabled="!selectedCount" @click="emit('batchMove')">
        {{ $t('sidePanel.batchMove') }}
      </PnButton>
      <PnButton variant="secondary" size="sm" :disabled="!selectedCount" @click="emit('batchTags')">
        {{ $t('sidePanel.batchTags') }}
      </PnButton>
    </div>
  </div>
</template>
