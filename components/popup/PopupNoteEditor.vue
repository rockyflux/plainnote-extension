<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import WorkbenchIcon, { type WorkbenchIconName } from '@/components/workbench/WorkbenchIcon.vue';
import { useSettingsStore } from '@/stores/settings';
import { formatNumber } from '@/utils/format';
import { MAX_CONTENT_LENGTH } from '@/utils/constants';

const props = defineProps<{
  modelValue: string;
  draftStatus?: string;
  charCount: number;
  /** Grow to fill parent (detached popup). */
  fill?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { t } = useI18n();
const settingsStore = useSettingsStore();
const { settings, resolvedLocale } = storeToRefs(settingsStore);
const editorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null);

const overLimit = computed(() => props.charCount > MAX_CONTENT_LENGTH);
const countLabel = computed(
  () =>
    `${formatNumber(props.charCount, resolvedLocale.value)} / ${formatNumber(MAX_CONTENT_LENGTH, resolvedLocale.value)}`,
);

const tools: { icon: WorkbenchIconName; snippet: string; titleKey: string }[] = [
  { icon: 'bold', snippet: '**bold**', titleKey: 'workbench.toolBold' },
  { icon: 'italic', snippet: '*italic*', titleKey: 'workbench.toolItalic' },
  { icon: 'strike', snippet: '~~strike~~', titleKey: 'workbench.toolStrike' },
  { icon: 'code', snippet: '`code`', titleKey: 'workbench.toolInlineCode' },
  { icon: 'link', snippet: '[text](url)', titleKey: 'workbench.toolLink' },
  { icon: 'list', snippet: '- ', titleKey: 'workbench.toolBullet' },
  { icon: 'ordered', snippet: '1. ', titleKey: 'workbench.toolOrdered' },
];

function insert(snippet: string) {
  editorRef.value?.insertAtCursor(snippet);
}
</script>

<template>
  <div
    class="flex flex-col overflow-hidden rounded-[10px] border border-pn-border bg-pn-bg"
    :class="fill ? 'h-full min-h-[200px]' : 'h-[200px]'"
  >
    <div class="min-h-0 flex-1 overflow-hidden">
      <MarkdownEditor
        ref="editorRef"
        :model-value="modelValue"
        format="markdown"
        compact
        class="h-full"
        :placeholder="t('popup.markdownPlaceholder')"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </div>

    <div
      class="flex shrink-0 items-center justify-between gap-2 border-t border-pn-border bg-pn-bg-sub/60 px-2 py-1.5"
    >
      <div class="flex min-w-0 items-center gap-0.5 overflow-x-auto">
        <template v-if="settings.editorShowToolbar">
          <button
            v-for="tool in tools"
            :key="tool.icon"
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[#6b7280] hover:bg-pn-bg hover:text-pn-text"
            :title="t(tool.titleKey)"
            @click="insert(tool.snippet)"
          >
            <WorkbenchIcon :name="tool.icon" :size="14" />
          </button>
          <button
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[#6b7280] hover:bg-pn-bg hover:text-pn-text"
            :title="t('workbench.toolMore')"
          >
            <WorkbenchIcon name="more" :size="14" />
          </button>
        </template>
        <span v-else-if="draftStatus" class="truncate px-1 text-[11px] text-pn-text-sub">
          {{ draftStatus }}
        </span>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <span
          v-if="draftStatus && settings.editorShowToolbar"
          class="hidden text-[11px] text-pn-text-sub sm:inline"
        >
          {{ draftStatus }}
        </span>
        <span
          class="tabular-nums text-[11px]"
          :class="overLimit ? 'font-medium text-pn-danger' : 'text-pn-text-sub'"
        >
          {{ countLabel }}
        </span>
      </div>
    </div>
  </div>
</template>
