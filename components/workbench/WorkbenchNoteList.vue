<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
// withDefaults is a compiler macro
import { storeToRefs } from 'pinia';
import type { LocalNote } from '@/types';
import WorkbenchIcon from '@/components/workbench/WorkbenchIcon.vue';
import PnEmpty from '@/components/ui/PnEmpty.vue';
import { formatNoteListTime } from '@/utils/format';
import { noteExcerpt } from '@/utils/note-filters';
import { useSettingsStore } from '@/stores/settings';
import { useOrganizationStore } from '@/stores/organization';

const props = withDefaults(
  defineProps<{
    title: string;
    notes: LocalNote[];
    activeLocalId?: number | null;
    loading?: boolean;
    emptyTitle: string;
    pageSize?: number;
    compact?: boolean;
    query?: string;
    showSearch?: boolean;
  }>(),
  {
    pageSize: 20,
    compact: false,
    query: '',
    showSearch: true,
  },
);

const emit = defineEmits<{
  select: [localId: number];
  toggleFavorite: [localId: number];
  'update:query': [value: string];
}>();

const searchShortcut = computed(() =>
  /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl + K',
);

const settingsStore = useSettingsStore();
const orgStore = useOrganizationStore();
const { resolvedLocale } = storeToRefs(settingsStore);
const { tags } = storeToRefs(orgStore);

const viewMode = ref<'list' | 'grid'>('list');
const page = ref(1);
const size = computed(() => props.pageSize ?? 20);

watch(
  () => props.notes,
  () => {
    page.value = 1;
  },
);

const totalPages = computed(() => Math.max(1, Math.ceil(props.notes.length / size.value)));

const pageNotes = computed(() => {
  const start = (page.value - 1) * size.value;
  return props.notes.slice(start, start + size.value);
});

function tagMeta(ids: number[] | undefined) {
  const set = new Set(ids ?? []);
  return tags.value.filter((t) => t.id != null && set.has(t.id));
}

function prevPage() {
  if (page.value > 1) page.value -= 1;
}

function nextPage() {
  if (page.value < totalPages.value) page.value += 1;
}
</script>

<template>
  <section
    class="flex h-full min-h-0 flex-col bg-pn-bg"
    :class="compact ? 'w-full' : 'w-[300px] shrink-0 border-r border-pn-border'"
  >
    <div v-if="props.showSearch" class="border-b border-pn-border px-3 pb-2 pt-3">
      <div class="relative">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pn-text-muted">
          <WorkbenchIcon name="search" :size="15" />
        </span>
        <input
          :value="query ?? ''"
          type="search"
          class="h-9 w-full rounded-[8px] border border-pn-border bg-white pl-9 pr-14 text-[13px] text-pn-text outline-none transition placeholder:text-pn-text-muted focus:border-pn-accent"
          :placeholder="$t('workbench.searchPlaceholder')"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
        />
        <kbd
          class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-pn-border bg-pn-bg-sub px-1.5 py-0.5 text-[10px] text-pn-text-muted"
        >{{ searchShortcut }}</kbd>
      </div>
    </div>

    <div class="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-pn-border px-3">
      <div class="flex min-w-0 items-center gap-2">
        <WorkbenchIcon name="folder" :size="15" class="text-pn-text-muted" />
        <div class="min-w-0 truncate text-[13px] font-semibold text-pn-text">
          {{ title }}
          <span class="ml-1 font-normal tabular-nums text-pn-text-muted">{{ notes.length }}</span>
        </div>
      </div>
      <div class="flex items-center gap-0.5">
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-[6px] transition"
          :class="viewMode === 'list' ? 'bg-pn-accent-soft text-pn-accent' : 'text-pn-text-muted hover:bg-pn-bg-sub hover:text-pn-text'"
          :title="$t('workbench.listView')"
          @click="viewMode = 'list'"
        >
          <WorkbenchIcon name="list" :size="14" />
        </button>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-[6px] transition"
          :class="viewMode === 'grid' ? 'bg-pn-accent-soft text-pn-accent' : 'text-pn-text-muted hover:bg-pn-bg-sub hover:text-pn-text'"
          :title="$t('workbench.gridView')"
          @click="viewMode = 'grid'"
        >
          <WorkbenchIcon name="grid" :size="14" />
        </button>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-auto px-2 py-2">
      <p v-if="loading" class="px-2 py-3 text-[13px] text-pn-text-sub">{{ $t('loading.notes') }}</p>
      <PnEmpty v-else-if="notes.length === 0" :title="emptyTitle" />
      <ul
        v-else
        class="gap-1.5"
        :class="viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2' : 'flex flex-col'"
      >
        <li v-for="note in pageNotes" :key="note.localId ?? note.secret">
          <button
            type="button"
            class="group w-full rounded-[10px] border px-3 py-2.5 text-left transition"
            :class="
              note.localId === activeLocalId
                ? 'border-pn-accent bg-pn-accent-soft shadow-[0_0_0_1px_rgb(0_102_255_/0.08)]'
                : 'border-transparent bg-transparent hover:border-pn-border hover:bg-white'
            "
            @click="note.localId != null && emit('select', note.localId)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="truncate text-[14px] font-semibold leading-5 text-pn-text">
                  {{ note.title || $t('sidePanel.untitled') }}
                </div>
                <div class="mt-1 line-clamp-2 text-[12px] leading-[18px] text-pn-text-sub">
                  {{ noteExcerpt(note.content, 120) }}
                </div>
              </div>
              <span
                role="button"
                tabindex="0"
                class="mt-0.5 shrink-0 text-pn-text-muted transition hover:text-pn-accent"
                :class="note.favorite ? '!text-pn-accent' : ''"
                @click.stop.prevent="note.localId != null && emit('toggleFavorite', note.localId)"
                @keydown.enter.stop.prevent="note.localId != null && emit('toggleFavorite', note.localId)"
              >
                <WorkbenchIcon name="star" :size="14" />
              </span>
            </div>
            <!-- Tags + time on one row: tags left, time right (not stacked above) -->
            <div class="mt-2 flex min-h-[20px] items-center gap-1.5">
              <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                <span
                  v-for="tag in tagMeta(note.tags).slice(0, 3)"
                  :key="tag.id"
                  class="max-w-[7rem] truncate rounded-[4px] px-1.5 py-0.5 text-[11px] leading-4"
                  :style="
                    tag.color
                      ? { background: `${tag.color}18`, color: tag.color }
                      : undefined
                  "
                  :class="!tag.color ? 'bg-pn-accent-soft text-pn-accent' : ''"
                >
                  {{ tag.name }}
                </span>
              </div>
              <span class="shrink-0 text-[11px] tabular-nums text-pn-text-muted">
                {{ formatNoteListTime(note.updatedAt, resolvedLocale) }}
              </span>
            </div>
          </button>
        </li>
      </ul>
    </div>

    <div
      v-if="notes.length > size"
      class="flex h-10 shrink-0 items-center justify-center gap-3 border-t border-pn-border px-3 text-[12px] text-pn-text-sub"
    >
      <button
        type="button"
        class="rounded px-2 py-1 hover:bg-pn-bg-sub disabled:opacity-40"
        :disabled="page <= 1"
        @click="prevPage"
      >
        ‹
      </button>
      <span class="tabular-nums">
        {{ $t('workbench.pageOf', { page, total: totalPages }) }}
      </span>
      <button
        type="button"
        class="rounded px-2 py-1 hover:bg-pn-bg-sub disabled:opacity-40"
        :disabled="page >= totalPages"
        @click="nextPage"
      >
        ›
      </button>
    </div>
  </section>
</template>
