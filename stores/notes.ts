import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CreateNotePayload, LocalNote, UpdateNotePayload } from '@/types';
import { noteService, type CreateLocalOptions } from '@/services/note-service';
import { notesRepository } from '@/repositories/notes-repository';
import { ensureDatabaseSeeded } from '@/repositories/db';

export const useNotesStore = defineStore('notes', () => {
  const items = ref<LocalNote[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const lastCreated = ref<LocalNote | null>(null);

  async function refresh() {
    loading.value = true;
    try {
      await ensureDatabaseSeeded();
      items.value = await noteService.listLocal();
    } finally {
      loading.value = false;
    }
  }

  async function create(
    serviceId: string,
    payload: CreateNotePayload,
    localOpts?: CreateLocalOptions,
  ) {
    saving.value = true;
    try {
      const note = await noteService.create(serviceId, payload, localOpts);
      lastCreated.value = note;
      await refresh();
      return note;
    } finally {
      saving.value = false;
    }
  }

  async function updateByLocalId(localId: number, payload: UpdateNotePayload) {
    saving.value = true;
    try {
      const note = await noteService.updateByLocalId(localId, payload);
      await refresh();
      return note;
    } catch (err) {
      // Preserve local content; mark sync error so UI can show draft vs remote state.
      try {
        await notesRepository.setSyncStatus(localId, 'error');
        await refresh();
      } catch {
        // ignore secondary failures
      }
      throw err;
    } finally {
      saving.value = false;
    }
  }

  async function loadBySecret(serviceId: string, secret: string) {
    const note = await noteService.loadBySecret(serviceId, secret);
    await refresh();
    return note;
  }

  async function removeLocalIndexOnly(localId: number) {
    await noteService.removeLocalIndexOnly(localId);
    await refresh();
  }

  async function removeRemoteAndLocal(localId: number) {
    await noteService.removeRemoteAndLocalByLocalId(localId);
    await refresh();
  }

  async function touchOpened(localId: number) {
    await notesRepository.touchOpened(localId);
    await refresh();
  }

  async function setFavorite(localId: number, favorite: boolean) {
    await notesRepository.setFavorite(localId, favorite);
    await refresh();
  }

  async function setFolder(localId: number, folderId: number | null) {
    await notesRepository.setFolder(localId, folderId);
    await refresh();
  }

  async function setTags(localId: number, tagIds: number[]) {
    await notesRepository.setTags(localId, tagIds);
    await refresh();
  }

  async function batchFavorite(localIds: number[], favorite: boolean) {
    await notesRepository.batchSetFavorite(localIds, favorite);
    await refresh();
  }

  async function batchMove(localIds: number[], folderId: number | null) {
    await notesRepository.batchSetFolder(localIds, folderId);
    await refresh();
  }

  async function batchAddTags(localIds: number[], tagIds: number[]) {
    await notesRepository.batchAddTags(localIds, tagIds);
    await refresh();
  }

  function clearLastCreated() {
    lastCreated.value = null;
  }

  return {
    items,
    loading,
    saving,
    lastCreated,
    refresh,
    create,
    updateByLocalId,
    loadBySecret,
    removeLocalIndexOnly,
    removeRemoteAndLocal,
    touchOpened,
    setFavorite,
    setFolder,
    setTags,
    batchFavorite,
    batchMove,
    batchAddTags,
    clearLastCreated,
  };
});
