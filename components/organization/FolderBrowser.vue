<script lang="ts" setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import PnButton from '@/components/ui/PnButton.vue';
import PnInput from '@/components/ui/PnInput.vue';
import PnEmpty from '@/components/ui/PnEmpty.vue';
import { useOrganizationStore } from '@/stores/organization';
import { useNotesStore } from '@/stores/notes';

defineProps<{
  activeFolderId?: number | null;
}>();

const emit = defineEmits<{
  select: [folderId: number | null];
}>();

const org = useOrganizationStore();
const notes = useNotesStore();
const { folders } = storeToRefs(org);
const { items } = storeToRefs(notes);

const newName = ref('');
const editingId = ref<number | null>(null);
const editName = ref('');
const busy = ref(false);

function countInFolder(folderId: number | null) {
  return items.value.filter((n) =>
    folderId == null ? n.folderId == null : n.folderId === folderId,
  ).length;
}

async function addFolder() {
  const name = newName.value.trim();
  if (!name || busy.value) return;
  busy.value = true;
  try {
    await org.createFolder(name);
    newName.value = '';
  } finally {
    busy.value = false;
  }
}

function startEdit(id: number, name: string) {
  editingId.value = id;
  editName.value = name;
}

async function saveEdit() {
  if (editingId.value == null) return;
  const name = editName.value.trim();
  if (!name) return;
  await org.renameFolder(editingId.value, name);
  editingId.value = null;
}

async function remove(id: number) {
  await org.removeFolder(id);
  emit('select', null);
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex gap-1.5">
      <PnInput
        v-model="newName"
        :placeholder="$t('organization.newFolderPlaceholder')"
        class="flex-1"
      />
      <PnButton variant="secondary" size="sm" :disabled="busy" @click="addFolder">
        {{ $t('organization.add') }}
      </PnButton>
    </div>

    <PnEmpty
      v-if="folders.length === 0"
      :title="$t('sidePanel.folders')"
      :description="$t('organization.noFoldersYet')"
    />

    <ul v-else class="space-y-1.5">
      <li>
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-[8px] border px-3 py-2 text-left text-sm"
          :class="
            activeFolderId === null
              ? 'border-pn-accent bg-pn-accent-soft'
              : 'border-pn-border hover:bg-pn-bg-sub'
          "
          @click="emit('select', null)"
        >
          <span>{{ $t('organization.noFolder') }}</span>
          <span class="text-xs text-pn-text-sub">{{ countInFolder(null) }}</span>
        </button>
      </li>
      <li v-for="folder in folders" :key="folder.id">
        <div
          class="rounded-[8px] border px-3 py-2"
          :class="
            activeFolderId === folder.id
              ? 'border-pn-accent bg-pn-accent-soft'
              : 'border-pn-border'
          "
        >
          <div v-if="editingId === folder.id" class="flex gap-1.5">
            <PnInput v-model="editName" class="flex-1" />
            <PnButton variant="primary" size="sm" @click="saveEdit">
              {{ $t('common.save') }}
            </PnButton>
          </div>
          <div v-else class="flex items-center gap-2">
            <button
              type="button"
              class="min-w-0 flex-1 truncate text-left text-sm"
              @click="folder.id != null && emit('select', folder.id)"
            >
              {{ folder.name }}
              <span class="ml-1 text-xs text-pn-text-sub">{{ countInFolder(folder.id ?? -1) }}</span>
            </button>
            <PnButton
              variant="ghost"
              size="sm"
              @click="folder.id != null && startEdit(folder.id, folder.name)"
            >
              {{ $t('common.edit') }}
            </PnButton>
            <PnButton variant="ghost" size="sm" @click="folder.id != null && remove(folder.id)">
              {{ $t('common.delete') }}
            </PnButton>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
