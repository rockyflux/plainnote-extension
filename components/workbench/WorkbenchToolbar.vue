<script lang="ts" setup>
import WorkbenchIcon, { type WorkbenchIconName } from '@/components/workbench/WorkbenchIcon.vue';
import ShareMenu from '@/components/workbench/ShareMenu.vue';
import type { LocalNote } from '@/types';

export type ViewMode = 'edit' | 'preview' | 'split';

defineProps<{
  viewMode: ViewMode;
  format: 'markdown' | 'text';
  note: LocalNote | null;
  narrow?: boolean;
}>();

const emit = defineEmits<{
  'update:viewMode': [mode: ViewMode];
  insert: [snippet: string];
  undo: [];
  redo: [];
  fullscreen: [];
}>();

const mdTools: {
  icon: WorkbenchIconName;
  snippet: string;
  titleKey: string;
  caret?: boolean;
}[] = [
  { icon: 'heading', snippet: '## ', titleKey: 'workbench.toolHeading', caret: true },
  { icon: 'bold', snippet: '**bold**', titleKey: 'workbench.toolBold' },
  { icon: 'italic', snippet: '*italic*', titleKey: 'workbench.toolItalic' },
  { icon: 'strike', snippet: '~~strike~~', titleKey: 'workbench.toolStrike' },
  { icon: 'code', snippet: '`code`', titleKey: 'workbench.toolInlineCode' },
  { icon: 'link', snippet: '[text](url)', titleKey: 'workbench.toolLink' },
  { icon: 'image', snippet: '![alt](url)', titleKey: 'workbench.toolImage' },
  { icon: 'list', snippet: '- ', titleKey: 'workbench.toolBullet' },
  { icon: 'ordered', snippet: '1. ', titleKey: 'workbench.toolOrdered' },
  { icon: 'quote', snippet: '> ', titleKey: 'workbench.toolQuote' },
  { icon: 'codeBlock', snippet: '```\n\n```', titleKey: 'workbench.toolCode' },
  { icon: 'table', snippet: '| A | B |\n| --- | --- |\n|  |  |\n', titleKey: 'workbench.toolTable' },
];
</script>

<template>
  <div
    class="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-pn-border bg-pn-bg px-2 sm:px-3"
  >
    <div class="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
      <template v-if="format === 'markdown'">
        <button
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[#6b7280] transition hover:bg-pn-bg-sub hover:text-pn-text"
          :title="$t('workbench.toolUndo')"
          @click="emit('undo')"
        >
          <WorkbenchIcon name="undo" :size="15" />
        </button>
        <button
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[#6b7280] transition hover:bg-pn-bg-sub hover:text-pn-text"
          :title="$t('workbench.toolRedo')"
          @click="emit('redo')"
        >
          <WorkbenchIcon name="redo" :size="15" />
        </button>
        <span class="mx-0.5 h-4 w-px shrink-0 bg-pn-border" />
        <button
          v-for="tool in mdTools"
          :key="tool.icon"
          type="button"
          class="flex h-8 shrink-0 items-center gap-0.5 rounded-[6px] px-1.5 text-[#6b7280] transition hover:bg-pn-bg-sub hover:text-pn-text"
          :title="$t(tool.titleKey)"
          @click="emit('insert', tool.snippet)"
        >
          <WorkbenchIcon :name="tool.icon" :size="15" />
          <span
            v-if="tool.caret"
            class="text-[9px] leading-none text-pn-text-muted"
            aria-hidden="true"
          >▾</span>
        </button>
      </template>
      <span v-else class="px-2 text-[13px] text-pn-text-sub">{{ $t('editor.formatText') }}</span>
    </div>

    <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <ShareMenu v-if="note" :note="note" />
      <div class="flex items-center rounded-[8px] bg-pn-bg-sub p-0.5">
        <button
          type="button"
          class="flex items-center gap-1 rounded-[6px] px-2 py-1.5 text-[12px] font-medium transition sm:gap-1.5 sm:px-2.5 sm:text-[13px]"
          :class="
            viewMode === 'edit'
              ? 'bg-white text-pn-text shadow-sm'
              : 'text-pn-text-sub hover:text-pn-text'
          "
          @click="emit('update:viewMode', 'edit')"
        >
          <WorkbenchIcon name="edit" :size="14" />
          <span :class="narrow ? 'sr-only' : ''">{{ $t('editor.editMode') }}</span>
        </button>
        <button
          type="button"
          class="flex items-center gap-1 rounded-[6px] px-2 py-1.5 text-[12px] font-medium transition sm:gap-1.5 sm:px-2.5 sm:text-[13px]"
          :class="
            viewMode === 'preview'
              ? 'bg-white text-pn-text shadow-sm'
              : 'text-pn-text-sub hover:text-pn-text'
          "
          @click="emit('update:viewMode', 'preview')"
        >
          <WorkbenchIcon name="preview" :size="14" />
          <span :class="narrow ? 'sr-only' : ''">{{ $t('editor.preview') }}</span>
        </button>
        <button
          type="button"
          class="flex items-center gap-1 rounded-[6px] px-2 py-1.5 text-[12px] font-medium transition sm:gap-1.5 sm:px-2.5 sm:text-[13px]"
          :class="
            viewMode === 'split'
              ? 'bg-pn-accent text-white shadow-sm'
              : 'text-pn-text-sub hover:text-pn-text'
          "
          @click="emit('update:viewMode', 'split')"
        >
          <WorkbenchIcon name="split" :size="14" />
          <span :class="narrow ? 'sr-only' : ''">{{ $t('workbench.splitView') }}</span>
        </button>
      </div>
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-[6px] text-pn-text-sub transition hover:bg-pn-bg-sub hover:text-pn-text"
        :title="$t('editor.expand')"
        @click="emit('fullscreen')"
      >
        <WorkbenchIcon name="expand" :size="15" />
      </button>
    </div>
  </div>
</template>
