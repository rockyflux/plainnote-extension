<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import WorkbenchIcon, { type WorkbenchIconName } from '@/components/workbench/WorkbenchIcon.vue';
import { maskEditUrl } from '@/utils/share-links';

const props = defineProps<{
  kind: 'note' | 'raw' | 'edit';
  url: string;
  busy?: boolean;
}>();

const emit = defineEmits<{
  copy: [];
  open: [];
}>();

const { t } = useI18n();
const reveal = ref(false);

const icon = computed<WorkbenchIconName>(() => {
  if (props.kind === 'note') return 'globe';
  if (props.kind === 'raw') return 'document';
  return 'lock';
});

const title = computed(() => {
  if (props.kind === 'note') return t('popup.linkNote');
  if (props.kind === 'raw') return t('popup.linkRaw');
  return t('popup.linkEdit');
});

const badge = computed(() => {
  if (props.kind === 'note') return t('popup.linkNoteBadge');
  if (props.kind === 'edit') return t('popup.linkEditBadge');
  return '';
});

const displayUrl = computed(() => {
  if (props.kind !== 'edit') return props.url;
  return reveal.value ? props.url : maskEditUrl(props.url);
});
</script>

<template>
  <div class="flex items-start gap-2.5 rounded-[10px] border border-pn-border bg-pn-bg px-3 py-2.5">
    <span
      class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-pn-accent-soft text-pn-accent"
    >
      <WorkbenchIcon :name="icon" :size="15" />
    </span>
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-pn-text">
        <span>{{ title }}</span>
        <span v-if="badge" class="text-[11px] font-normal text-pn-text-sub">{{ badge }}</span>
        <button
          v-if="kind === 'edit'"
          type="button"
          class="text-[11px] text-pn-accent hover:underline"
          @click="reveal = !reveal"
        >
          {{ reveal ? t('share.hideSecret') : t('share.revealSecret') }}
        </button>
      </div>
      <code class="mt-0.5 block truncate text-[11px] text-pn-text-sub">{{ displayUrl }}</code>
    </div>
    <div class="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        class="rounded-[6px] p-1.5 text-pn-accent hover:bg-pn-accent-soft disabled:opacity-50"
        :title="t('common.copy')"
        :disabled="busy"
        @click="emit('copy')"
      >
        <WorkbenchIcon name="document" :size="14" />
      </button>
      <button
        type="button"
        class="rounded-[6px] p-1.5 text-pn-text-sub hover:bg-pn-bg-sub hover:text-pn-text disabled:opacity-50"
        :title="t('share.open')"
        :disabled="busy"
        @click="emit('open')"
      >
        <WorkbenchIcon name="external" :size="14" />
      </button>
    </div>
  </div>
</template>
