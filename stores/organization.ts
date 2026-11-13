import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { LocalFolder, LocalTag } from '@/types';
import { foldersRepository } from '@/repositories/folders-repository';
import { tagsRepository } from '@/repositories/tags-repository';
import { ensureDatabaseSeeded } from '@/repositories/db';

export const useOrganizationStore = defineStore('organization', () => {
  const folders = ref<LocalFolder[]>([]);
  const tags = ref<LocalTag[]>([]);
  const ready = ref(false);

  async function refresh() {
    await ensureDatabaseSeeded();
    folders.value = await foldersRepository.list();
    tags.value = await tagsRepository.list();
    ready.value = true;
  }

  async function ensureDefaults() {
    await refresh();
    if (folders.value.length === 0) {
      await foldersRepository.create('收件箱');
    }
    if (tags.value.length === 0) {
      await tagsRepository.create('快速记录', '#3b82f6');
    }
    await refresh();
  }

  async function createFolder(name: string) {
    const id = await foldersRepository.create(name);
    await refresh();
    return id;
  }

  async function renameFolder(id: number, name: string) {
    await foldersRepository.rename(id, name);
    await refresh();
  }

  async function removeFolder(id: number) {
    await foldersRepository.remove(id);
    await refresh();
  }

  async function createTag(name: string, color?: string) {
    const id = await tagsRepository.create(name, color);
    await refresh();
    return id;
  }

  async function updateTag(id: number, patch: { name?: string; color?: string | null }) {
    await tagsRepository.update(id, patch);
    await refresh();
  }

  async function removeTag(id: number) {
    await tagsRepository.remove(id);
    await refresh();
  }

  return {
    folders,
    tags,
    ready,
    refresh,
    ensureDefaults,
    createFolder,
    renameFolder,
    removeFolder,
    createTag,
    updateTag,
    removeTag,
  };
});
