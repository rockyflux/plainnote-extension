<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import WorkbenchIcon from '@/components/workbench/WorkbenchIcon.vue';

defineProps<{
  badgeKey?: string;
  showBadge?: boolean;
  showDetach?: boolean;
}>();

const emit = defineEmits<{
  detach: [];
  openWorkbench: [];
  openOptions: [];
  close: [];
}>();

const { t } = useI18n();
</script>

<template>
  <header class="flex items-center justify-between gap-2 border-b border-pn-border px-4 py-3">
    <div class="flex min-w-0 items-center gap-2">
      <span class="flex h-7 w-7 shrink-0 items-center justify-center text-pn-accent" aria-hidden="true">
        <WorkbenchIcon name="logo" :size="22" />
      </span>
      <span class="text-[15px] font-bold text-pn-text">{{ t('popup.title') }}</span>
      <span
        v-if="showBadge !== false && badgeKey"
        class="truncate rounded-full bg-pn-accent-soft px-2 py-0.5 text-[11px] font-medium text-pn-accent"
      >
        {{ t(badgeKey) }}
      </span>
    </div>
    <div class="flex shrink-0 items-center gap-0.5">
      <button
        v-if="showDetach"
        type="button"
        class="rounded-[6px] p-1.5 text-pn-text-sub hover:bg-pn-bg-sub hover:text-pn-text"
        :title="t('popup.openDetached')"
        @click="emit('detach')"
      >
        <WorkbenchIcon name="popout" :size="15" />
      </button>
      <button
        type="button"
        class="rounded-[6px] p-1.5 text-pn-text-sub hover:bg-pn-bg-sub hover:text-pn-text"
        :title="t('popup.openWorkbench')"
        @click="emit('openWorkbench')"
      >
        <WorkbenchIcon name="external" :size="15" />
      </button>
      <button
        type="button"
        class="rounded-[6px] p-1.5 text-pn-text-sub hover:bg-pn-bg-sub hover:text-pn-text"
        :title="t('popup.openOptions')"
        @click="emit('openOptions')"
      >
        <WorkbenchIcon name="settings" :size="15" />
      </button>
      <button
        type="button"
        class="rounded-[6px] p-1.5 text-pn-text-sub hover:bg-pn-bg-sub hover:text-pn-text"
        :title="t('common.close')"
        @click="emit('close')"
      >
        <WorkbenchIcon name="close" :size="15" />
      </button>
    </div>
  </header>
</template>
