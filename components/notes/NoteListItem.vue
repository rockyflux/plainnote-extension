<script lang="ts" setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import type { LocalNote, LocalTag } from '@/types';
import { formatDateTime } from '@/utils/format';
import { noteExcerpt } from '@/utils/note-filters';
import { useSettingsStore } from '@/stores/settings';
import { useServicesStore } from '@/stores/services';
import { useOrganizationStore } from '@/stores/organization';

const props = defineProps<{
  note: LocalNote;
  active?: boolean;
  selectable?: boolean;
  selected?: boolean;
  tagMap?: Map<number, LocalTag>;
}>();

const emit = defineEmits<{
  select: [];
  toggleSelect: [];
  toggleFavorite: [];
}>();

const { resolvedLocale } = storeToRefs(useSettingsStore());
const servicesStore = useServicesStore();
const orgStore = useOrganizationStore();
const { items: services } = storeToRefs(servicesStore);
const { tags } = storeToRefs(orgStore);

const serviceName = computed(() => {
  return services.value.find((s) => s.id === props.note.serviceId)?.name ?? props.note.serviceId;
});

const noteTags = computed(() => {
  const map = props.tagMap;
  const ids = props.note.tags ?? [];
  if (map) return ids.map((id) => map.get(id)).filter(Boolean) as LocalTag[];
  return tags.value.filter((t) => t.id != null && ids.includes(t.id));
});
</script>

<template>
  <div
    class="flex w-full items-stretch gap-1 rounded-[8px] border transition-colors"
    :class="
      active
        ? 'border-pn-accent bg-pn-accent-soft'
        : 'border-pn-border bg-pn-bg hover:bg-pn-bg-sub'
    "
  >
    <label v-if="selectable" class="flex items-center px-2" @click.stop>
      <input
        type="checkbox"
        class="size-3.5"
        :checked="selected"
        @change="emit('toggleSelect')"
      />
    </label>
    <button type="button" class="min-w-0 flex-1 px-3.5 py-3 text-left" @click="emit('select')">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="truncate text-base font-medium text-pn-text">
            {{ note.title || $t('sidePanel.untitled') }}
          </div>
          <div class="mt-1 line-clamp-2 text-sm text-pn-text-sub">
            {{ noteExcerpt(note.content) }}
          </div>
        </div>
        <span
          role="button"
          tabindex="0"
          class="shrink-0 cursor-pointer text-sm"
          :class="note.favorite ? 'text-pn-accent' : 'text-pn-text-sub'"
          :title="$t('sidePanel.favorites')"
          @click.stop.prevent="emit('toggleFavorite')"
          @keydown.enter.stop.prevent="emit('toggleFavorite')"
        >
          {{ note.favorite ? '★' : '☆' }}
        </span>
      </div>
      <div class="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-pn-text-sub">
        <span>{{ formatDateTime(note.updatedAt, resolvedLocale) }}</span>
        <span>·</span>
        <span>
          {{
            note.format === 'markdown' ? $t('editor.formatMarkdown') : $t('editor.formatText')
          }}
        </span>
        <span>·</span>
        <span class="truncate">{{ serviceName }}</span>
      </div>
      <div v-if="noteTags.length" class="mt-2 flex flex-wrap gap-1.5">
        <span
          v-for="tag in noteTags"
          :key="tag.id"
          class="rounded px-2 py-0.5 text-xs"
          :class="!tag.color ? 'bg-pn-bg-sub text-pn-text-sub' : ''"
          :style="tag.color ? { background: `${tag.color}22`, color: tag.color } : undefined"
        >
          {{ tag.name }}
        </span>
      </div>
    </button>
  </div>
</template>
