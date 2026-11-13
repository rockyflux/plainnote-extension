<script lang="ts" setup>
import PnEmpty from '@/components/ui/PnEmpty.vue';
import NoteListItem from '@/components/notes/NoteListItem.vue';
import type { LocalNote } from '@/types';

defineProps<{
  notes: LocalNote[];
  activeLocalId?: number | null;
  emptyTitle: string;
  emptyDescription?: string;
  selectable?: boolean;
  selectedIds?: number[];
}>();

const emit = defineEmits<{
  select: [localId: number];
  toggleSelect: [localId: number];
  toggleFavorite: [localId: number];
}>();
</script>

<template>
  <PnEmpty v-if="notes.length === 0" :title="emptyTitle" :description="emptyDescription" />
  <ul v-else class="space-y-2">
    <li v-for="note in notes" :key="note.localId ?? note.secret">
      <NoteListItem
        :note="note"
        :active="note.localId === activeLocalId"
        :selectable="selectable"
        :selected="note.localId != null && (selectedIds ?? []).includes(note.localId)"
        @select="note.localId != null && emit('select', note.localId)"
        @toggle-select="note.localId != null && emit('toggleSelect', note.localId)"
        @toggle-favorite="note.localId != null && emit('toggleFavorite', note.localId)"
      />
    </li>
  </ul>
</template>
