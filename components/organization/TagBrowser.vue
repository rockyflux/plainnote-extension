<script lang="ts" setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import PnButton from '@/components/ui/PnButton.vue';
import PnInput from '@/components/ui/PnInput.vue';
import PnEmpty from '@/components/ui/PnEmpty.vue';
import { useOrganizationStore } from '@/stores/organization';
import { useNotesStore } from '@/stores/notes';

defineProps<{
  activeTagId?: number | null;
}>();

const emit = defineEmits<{
  select: [tagId: number];
}>();

const org = useOrganizationStore();
const notes = useNotesStore();
const { tags } = storeToRefs(org);
const { items } = storeToRefs(notes);

const newName = ref('');
const newColor = ref('#3b82f6');
const editingId = ref<number | null>(null);
const editName = ref('');
const editColor = ref('#3b82f6');
const busy = ref(false);

const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

function countTag(tagId: number) {
  return items.value.filter((n) => (n.tags ?? []).includes(tagId)).length;
}

async function addTag() {
  const name = newName.value.trim();
  if (!name || busy.value) return;
  busy.value = true;
  try {
    await org.createTag(name, newColor.value);
    newName.value = '';
  } finally {
    busy.value = false;
  }
}

function startEdit(id: number, name: string, color?: string) {
  editingId.value = id;
  editName.value = name;
  editColor.value = color || '#3b82f6';
}

async function saveEdit() {
  if (editingId.value == null) return;
  const name = editName.value.trim();
  if (!name) return;
  await org.updateTag(editingId.value, { name, color: editColor.value });
  editingId.value = null;
}

async function remove(id: number) {
  await org.removeTag(id);
}
</script>

<template>
  <div class="space-y-3">
    <div class="space-y-1.5">
      <div class="flex gap-1.5">
        <PnInput
          v-model="newName"
          :placeholder="$t('organization.newTagPlaceholder')"
          class="flex-1"
        />
        <input v-model="newColor" type="color" class="h-9 w-10 rounded border border-pn-border" />
        <PnButton variant="secondary" size="sm" :disabled="busy" @click="addTag">
          {{ $t('organization.add') }}
        </PnButton>
      </div>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="c in palette"
          :key="c"
          type="button"
          class="size-4 rounded-full border border-pn-border"
          :style="{ background: c }"
          @click="newColor = c"
        />
      </div>
    </div>

    <PnEmpty
      v-if="tags.length === 0"
      :title="$t('sidePanel.tags')"
      :description="$t('organization.noTagsYet')"
    />

    <ul v-else class="space-y-1.5">
      <li v-for="tag in tags" :key="tag.id">
        <div
          class="rounded-[8px] border px-3 py-2"
          :class="
            activeTagId === tag.id ? 'border-pn-accent bg-pn-accent-soft' : 'border-pn-border'
          "
        >
          <div v-if="editingId === tag.id" class="space-y-1.5">
            <div class="flex gap-1.5">
              <PnInput v-model="editName" class="flex-1" />
              <input
                v-model="editColor"
                type="color"
                class="h-9 w-10 rounded border border-pn-border"
              />
              <PnButton variant="primary" size="sm" @click="saveEdit">
                {{ $t('common.save') }}
              </PnButton>
            </div>
          </div>
          <div v-else class="flex items-center gap-2">
            <button
              type="button"
              class="flex min-w-0 flex-1 items-center gap-2 truncate text-left text-sm"
              @click="tag.id != null && emit('select', tag.id)"
            >
              <span
                class="inline-block size-2.5 shrink-0 rounded-full"
                :style="{ background: tag.color || '#94a3b8' }"
              />
              <span class="truncate">{{ tag.name }}</span>
              <span class="text-xs text-pn-text-sub">{{ countTag(tag.id!) }}</span>
            </button>
            <PnButton
              variant="ghost"
              size="sm"
              @click="tag.id != null && startEdit(tag.id, tag.name, tag.color)"
            >
              {{ $t('common.edit') }}
            </PnButton>
            <PnButton variant="ghost" size="sm" @click="tag.id != null && remove(tag.id)">
              {{ $t('common.delete') }}
            </PnButton>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
