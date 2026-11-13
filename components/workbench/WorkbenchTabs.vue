<script lang="ts" setup>
import type { LocalNote } from '@/types';
import WorkbenchIcon from '@/components/workbench/WorkbenchIcon.vue';

defineProps<{
  tabs: LocalNote[];
  activeLocalId: number | null;
}>();

const emit = defineEmits<{
  select: [localId: number];
  close: [localId: number];
  create: [];
}>();

function tabLabel(note: LocalNote) {
  const title = (note.title || '').trim() || note.content.split('\n')[0]?.slice(0, 24) || '';
  const base = title || 'untitled';
  return note.format === 'markdown' && !base.endsWith('.md') ? `${base}.md` : base;
}
</script>

<template>
  <div class="flex h-11 shrink-0 items-stretch gap-0 border-b border-pn-border bg-white px-1.5">
    <button
      v-for="tab in tabs"
      :key="tab.localId"
      type="button"
      class="group relative flex max-w-[200px] items-center gap-1.5 px-3 text-[13px] transition"
      :class="
        activeLocalId === tab.localId
          ? 'font-medium text-pn-accent'
          : 'text-pn-text-sub hover:text-pn-text'
      "
      @click="tab.localId != null && emit('select', tab.localId)"
    >
      <span class="truncate">{{ tabLabel(tab) }}</span>
      <span
        class="flex h-5 w-5 items-center justify-center rounded text-pn-text-muted opacity-0 transition hover:bg-pn-bg-sub hover:text-pn-text group-hover:opacity-70"
        :class="activeLocalId === tab.localId ? '!opacity-55' : ''"
        role="button"
        tabindex="0"
        @click.stop="tab.localId != null && emit('close', tab.localId)"
        @keydown.enter.stop="tab.localId != null && emit('close', tab.localId)"
      >
        <WorkbenchIcon name="close" :size="12" />
      </span>
      <span
        v-if="activeLocalId === tab.localId"
        class="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-pn-accent"
      />
    </button>
    <button
      type="button"
      class="ml-0.5 flex w-9 items-center justify-center text-pn-text-muted transition hover:text-pn-accent"
      :title="$t('workbench.newNote')"
      @click="emit('create')"
    >
      <WorkbenchIcon name="plus" :size="15" />
    </button>
  </div>
</template>
