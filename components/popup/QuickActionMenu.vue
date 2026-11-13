<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import WorkbenchIcon, { type WorkbenchIconName } from '@/components/workbench/WorkbenchIcon.vue';
import { COMMAND_IDS } from '@/utils/constants';
import { loadCommandShortcuts } from '@/utils/command-shortcuts';

const emit = defineEmits<{
  newNote: [];
  clip: [];
  savePage: [];
  openWorkbench: [];
}>();

const { t } = useI18n();

/** Live shortcuts from browser Commands API — empty means not set / do not show. */
const shortcuts = ref<Record<string, string>>({});

onMounted(async () => {
  shortcuts.value = await loadCommandShortcuts();
});

const actions: {
  key: string;
  icon: WorkbenchIconName;
  titleKey: string;
  descKey: string;
  /** Browser command id; badge only shown when that command has a binding. */
  commandId?: string;
  run: () => void;
  chevron?: boolean;
}[] = [
  {
    key: 'new',
    icon: 'plus',
    titleKey: 'popup.actionNewNote',
    descKey: 'popup.actionNewNoteDesc',
    commandId: COMMAND_IDS.quickCreate,
    run: () => emit('newNote'),
  },
  {
    key: 'clip',
    icon: 'quoteMark',
    titleKey: 'popup.actionClip',
    descKey: 'popup.actionClipDesc',
    commandId: COMMAND_IDS.saveSelection,
    run: () => emit('clip'),
  },
  {
    key: 'page',
    icon: 'link',
    titleKey: 'popup.actionSavePage',
    descKey: 'popup.actionSavePageDesc',
    run: () => emit('savePage'),
    chevron: true,
  },
  {
    key: 'workbench',
    icon: 'workbench',
    titleKey: 'popup.actionWorkbench',
    descKey: 'popup.actionWorkbenchDesc',
    run: () => emit('openWorkbench'),
  },
];

function shortcutFor(commandId?: string): string {
  if (!commandId) return '';
  return shortcuts.value[commandId] || '';
}
</script>

<template>
  <div class="space-y-1.5 p-3">
    <button
      v-for="action in actions"
      :key="action.key"
      type="button"
      class="flex w-full items-center gap-3 rounded-[12px] border border-transparent px-3 py-3 text-left transition hover:border-pn-border hover:bg-pn-bg-sub"
      @click="action.run()"
    >
      <span
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-pn-accent-soft text-pn-accent"
      >
        <WorkbenchIcon :name="action.icon" :size="18" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-[14px] font-semibold text-pn-text">{{ t(action.titleKey) }}</span>
        <span class="mt-0.5 block text-[12px] text-pn-text-sub">{{ t(action.descKey) }}</span>
      </span>
      <span
        v-if="shortcutFor(action.commandId)"
        class="shrink-0 rounded-[6px] bg-pn-bg-sub px-1.5 py-0.5 font-pn-mono text-[10px] font-medium text-pn-text-muted"
      >
        {{ shortcutFor(action.commandId) }}
      </span>
      <span v-else-if="action.chevron" class="shrink-0 text-pn-text-muted">
        <WorkbenchIcon name="chevron" :size="14" />
      </span>
    </button>
  </div>
</template>
