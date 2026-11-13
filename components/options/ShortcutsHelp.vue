<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import PnButton from '@/components/ui/PnButton.vue';
import { COMMAND_IDS } from '@/utils/constants';
import { loadCommandShortcuts } from '@/utils/command-shortcuts';

const { t } = useI18n();

interface ShortcutRow {
  id: string;
  label: string;
  suggested: string;
  current: string;
  command?: boolean;
}

const rows = ref<ShortcutRow[]>([
  {
    id: COMMAND_IDS.quickCreate,
    label: 'shortcuts.quickCreate',
    suggested: 'Alt + Shift + N',
    current: '',
    command: true,
  },
  {
    id: COMMAND_IDS.saveSelection,
    label: 'shortcuts.saveSelection',
    suggested: 'Alt + Shift + S',
    current: '',
    command: true,
  },
  {
    id: COMMAND_IDS.openSidePanel,
    label: 'shortcuts.openSidePanel',
    suggested: 'Alt + Shift + P',
    current: '',
    command: true,
  },
]);

onMounted(async () => {
  try {
    const live = await loadCommandShortcuts();
    rows.value = rows.value.map((row) => {
      if (!row.command) return row;
      return {
        ...row,
        current: live[row.id] || t('shortcuts.notSet'),
      };
    });
  } catch {
    rows.value = rows.value.map((row) => ({
      ...row,
      current: row.command ? row.suggested : row.current,
    }));
  }
});

function openBrowserShortcuts() {
  browser.tabs.create({ url: 'chrome://extensions/shortcuts' }).catch(() => {
    browser.tabs.create({ url: 'edge://extensions/shortcuts' }).catch(() => {
      // Fallback: stay on options page if chrome:// / edge:// cannot be opened.
    });
  });
}
</script>

<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-lg font-bold text-pn-text">{{ t('options.shortcutsSection') }}</h2>
      <p class="mt-1 text-sm text-pn-text-sub">{{ t('options.shortcutsHint') }}</p>
    </div>

    <ul class="space-y-2">
      <li
        v-for="row in rows"
        :key="row.id"
        class="rounded-[12px] border border-pn-border bg-pn-bg px-4 py-3"
      >
        <div class="text-sm font-medium text-pn-text">{{ t(row.label) }}</div>
        <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pn-text-sub">
          <span
            >{{ t('shortcuts.suggested') }}:
            <code class="font-pn-mono">{{ row.suggested }}</code></span
          >
          <span
            >{{ t('shortcuts.current') }}:
            <code class="font-pn-mono">{{ row.current }}</code></span
          >
        </div>
      </li>
    </ul>

    <div class="rounded-[12px] border border-pn-accent/20 bg-pn-accent-soft px-4 py-3 text-sm text-pn-text-sub">
      {{ t('options.shortcutsCustomizeHint') }}
    </div>

    <PnButton variant="primary" @click="openBrowserShortcuts">
      {{ t('options.openShortcutsPage') }}
    </PnButton>
  </section>
</template>
