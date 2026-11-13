<script lang="ts" setup>
export type SideNavKey =
  | 'all'
  | 'recentEdited'
  | 'recentOpened'
  | 'favorites'
  | 'shares'
  | 'folders'
  | 'tags';

defineProps<{
  modelValue: SideNavKey;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: SideNavKey];
}>();

const items: { key: SideNavKey; labelKey: string }[] = [
  { key: 'all', labelKey: 'sidePanel.allNotes' },
  { key: 'recentEdited', labelKey: 'sidePanel.recentEdited' },
  { key: 'recentOpened', labelKey: 'sidePanel.recentOpened' },
  { key: 'favorites', labelKey: 'sidePanel.favorites' },
  { key: 'shares', labelKey: 'sidePanel.shares' },
  { key: 'folders', labelKey: 'sidePanel.folders' },
  { key: 'tags', labelKey: 'sidePanel.tags' },
];
</script>

<template>
  <nav class="flex gap-1 overflow-x-auto border-b border-pn-border px-2 py-2">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="shrink-0 rounded-[8px] px-2 py-1 text-[11px] font-medium transition-colors"
      :class="
        modelValue === item.key
          ? 'bg-pn-accent-soft text-pn-accent'
          : 'text-pn-text-sub hover:bg-pn-bg-sub hover:text-pn-text'
      "
      @click="emit('update:modelValue', item.key)"
    >
      {{ $t(item.labelKey) }}
    </button>
  </nav>
</template>
