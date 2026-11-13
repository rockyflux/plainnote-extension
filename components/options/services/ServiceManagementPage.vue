<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import type { ServiceConnectionResult } from '@/types';
import { DEFAULT_SERVICE_ID } from '@/types';
import { useServicesStore } from '@/stores/services';
import { useToast } from '@/composables/useToast';
import { ServerUrlError } from '@/utils/url';
import AppDialog from '@/components/AppDialog.vue';
import ServiceList from '@/components/options/services/ServiceList.vue';
import ServiceEditor from '@/components/options/services/ServiceEditor.vue';
import ServiceDeleteDialog from '@/components/options/services/ServiceDeleteDialog.vue';

const { t } = useI18n();
const toast = useToast();
const servicesStore = useServicesStore();
const { items, loading, testingId } = storeToRefs(servicesStore);

const name = ref('');
const baseUrl = ref('');
const makeDefault = ref(false);
const formError = ref('');
const selectedId = ref<string | null>(null);
const editingId = ref<string | null>(null);
const isCreating = ref(false);
const draftResult = ref<ServiceConnectionResult | null>(null);
const testedUrl = ref<string | null>(null);

const deleteTargetId = ref<string | null>(null);
const deleteNoteCount = ref(0);

const discardOpen = ref(false);
const pendingAction = ref<null | { type: 'select' | 'add'; id?: string }>(null);

const initialized = ref(false);

const isEditing = computed(() => editingId.value != null && !isCreating.value);
const selected = computed(() => items.value.find((s) => s.id === selectedId.value) ?? null);

const mode = computed<'edit' | 'create'>(() => (isCreating.value ? 'create' : 'edit'));

const urlStale = computed(() => {
  if (isCreating.value) return true;
  if (!selected.value) return true;
  return baseUrl.value.trim() !== selected.value.baseUrl;
});

const effectiveDraft = computed(() => {
  if (!draftResult.value || !testedUrl.value) return null;
  if (testedUrl.value.trim() !== baseUrl.value.trim()) return null;
  return draftResult.value;
});

const isDirty = computed(() => {
  if (isCreating.value) {
    return (
      name.value.trim() !== '' ||
      (baseUrl.value.trim() !== '' && baseUrl.value.trim() !== 'https://') ||
      makeDefault.value
    );
  }
  const row = selected.value;
  if (!row) return false;
  return (
    name.value !== row.name ||
    baseUrl.value !== row.baseUrl ||
    makeDefault.value !== row.isDefault
  );
});

const canDelete = computed(() => {
  if (!editingId.value) return false;
  if (editingId.value === DEFAULT_SERVICE_ID) return false;
  return true;
});

const isLastService = computed(() => items.value.length <= 1);

const formTesting = computed(() => {
  const id = testingId.value;
  if (!id) return false;
  if (editingId.value && id === editingId.value) return true;
  return id === baseUrl.value.trim();
});

function clearDraftTest() {
  draftResult.value = null;
  testedUrl.value = null;
}

function loadServiceIntoForm(id: string) {
  const row = items.value.find((s) => s.id === id);
  if (!row) return;
  selectedId.value = row.id;
  editingId.value = row.id;
  isCreating.value = false;
  name.value = row.name;
  baseUrl.value = row.baseUrl;
  makeDefault.value = row.isDefault;
  formError.value = '';
  clearDraftTest();
}

function resetFormForCreate() {
  selectedId.value = null;
  editingId.value = null;
  isCreating.value = true;
  name.value = '';
  baseUrl.value = 'https://';
  makeDefault.value = items.value.length === 0;
  formError.value = '';
  clearDraftTest();
}

function requestSelect(id: string) {
  if (selectedId.value === id && !isCreating.value) {
    loadServiceIntoForm(id);
    return;
  }
  if (isDirty.value) {
    pendingAction.value = { type: 'select', id };
    discardOpen.value = true;
    return;
  }
  loadServiceIntoForm(id);
}

function requestAdd() {
  if (isCreating.value && !isDirty.value) return;
  if (isDirty.value) {
    pendingAction.value = { type: 'add' };
    discardOpen.value = true;
    return;
  }
  resetFormForCreate();
}

function confirmDiscard() {
  const action = pendingAction.value;
  discardOpen.value = false;
  pendingAction.value = null;
  if (!action) return;
  if (action.type === 'add') {
    resetFormForCreate();
    return;
  }
  if (action.type === 'select' && action.id) {
    loadServiceIntoForm(action.id);
  }
}

function cancelDiscard() {
  discardOpen.value = false;
  pendingAction.value = null;
}

function cancelForm() {
  if (isCreating.value) {
    const fallback =
      items.value.find((s) => s.isDefault)?.id ?? items.value[0]?.id ?? null;
    if (fallback) {
      loadServiceIntoForm(fallback);
    } else {
      resetFormForCreate();
    }
    return;
  }
  if (selectedId.value) {
    loadServiceIntoForm(selectedId.value);
  }
}

async function onSubmit() {
  formError.value = '';
  try {
    if (isEditing.value && editingId.value) {
      await servicesStore.update(editingId.value, {
        name: name.value,
        baseUrl: baseUrl.value,
      });
      if (makeDefault.value) {
        await servicesStore.setDefault(editingId.value);
      }
      toast.show(t('options.serviceUpdated'));
      loadServiceIntoForm(editingId.value);
    } else {
      const created = await servicesStore.create({
        name: name.value,
        baseUrl: baseUrl.value,
        makeDefault: makeDefault.value || items.value.length === 0,
      });
      toast.show(t('options.serviceAdded'));
      loadServiceIntoForm(created.id);
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'HOST_PERMISSION_DENIED') {
      formError.value = t('errors.hostPermissionDenied');
      return;
    }
    formError.value =
      err instanceof ServerUrlError
        ? t(`errors.serverUrl.${err.code}`)
        : t('errors.invalidServerUrl');
  }
}

async function onTest() {
  formError.value = '';
  const url = baseUrl.value.trim();
  if (!url) {
    formError.value = t('errors.serverUrl.EMPTY');
    return;
  }

  // Prefer testing the form URL so dirty edits are probed, not the stale stored origin.
  const target =
    isEditing.value && editingId.value && !urlStale.value
      ? editingId.value
      : url;

  const result = await servicesStore.test(target);
  draftResult.value = result;
  testedUrl.value = url;

  if (result.ok) {
    toast.show(
      result.preferHttpsHint
        ? t('options.connectionOkHttpHint')
        : t('options.connectionOk'),
    );
  } else if (result.message === 'TIMEOUT') {
    toast.show(t('options.connectionTimeout'));
  } else if (result.message === 'NETWORK_ERROR') {
    toast.show(t('options.connectionNetworkError'));
  } else if (result.message === 'HOST_PERMISSION_DENIED') {
    toast.show(t('errors.hostPermissionDenied'));
  } else {
    toast.show(t('options.connectionFailed', { code: result.message }));
  }
}

async function requestDelete(id: string) {
  if (id === DEFAULT_SERVICE_ID) {
    toast.show(t('options.cannotDeleteOfficial'));
    return;
  }
  if (items.value.length <= 1) {
    deleteNoteCount.value = 0;
    deleteTargetId.value = id;
    return;
  }
  deleteNoteCount.value = await servicesStore.noteCount(id);
  deleteTargetId.value = id;
}

async function confirmDelete() {
  const id = deleteTargetId.value;
  deleteTargetId.value = null;
  if (!id) return;
  if (items.value.length <= 1) {
    toast.show(t('options.deleteLastServiceBody'));
    return;
  }
  try {
    await servicesStore.remove(id);
    toast.show(t('options.serviceDeleted'));
    const next =
      items.value.find((s) => s.isDefault)?.id ?? items.value[0]?.id ?? null;
    if (next) {
      loadServiceIntoForm(next);
    } else {
      resetFormForCreate();
    }
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'SERVICE_IN_USE') {
      toast.show(t('options.serviceInUse'));
    } else if (code === 'CANNOT_DELETE_OFFICIAL_SERVICE') {
      toast.show(t('options.cannotDeleteOfficial'));
    } else {
      toast.show(t('common.error'));
    }
  }
}

function openServiceSite(url: string) {
  const target = url.trim();
  if (!target.startsWith('http')) return;
  browser.tabs.create({ url: target }).catch(() => {
    window.open(target, '_blank', 'noopener,noreferrer');
  });
}

async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.show(t('options.addressCopied'));
  } catch {
    toast.show(t('errors.clipboardFailed'));
  }
}

watch(baseUrl, () => {
  if (testedUrl.value && testedUrl.value.trim() !== baseUrl.value.trim()) {
    draftResult.value = null;
  }
});

watch(items, (list) => {
  if (!initialized.value || isCreating.value) return;
  // Keep selection in sync if the selected row disappeared after delete/refresh.
  if (selectedId.value && !list.some((s) => s.id === selectedId.value)) {
    const next = list.find((s) => s.isDefault)?.id ?? list[0]?.id ?? null;
    if (next) loadServiceIntoForm(next);
    else resetFormForCreate();
  }
});

onMounted(async () => {
  await servicesStore.refresh();
  const def = items.value.find((s) => s.isDefault) ?? items.value[0];
  if (def) loadServiceIntoForm(def.id);
  else resetFormForCreate();
  initialized.value = true;
});
</script>

<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-lg font-bold text-pn-text">{{ t('options.serverSection') }}</h2>
      <p class="mt-1 text-sm text-pn-text-sub">{{ t('options.serverManageHint') }}</p>
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.15fr)]">
      <ServiceList
        :items="items"
        :selected-id="isCreating ? null : selectedId"
        :testing-id="testingId"
        :loading="loading && items.length === 0"
        @add="requestAdd"
        @select="requestSelect"
        @open-site="openServiceSite"
        @copy-url="copyUrl"
        @edit="requestSelect"
        @remove="requestDelete"
      />

      <ServiceEditor
        v-if="isCreating || selected"
        :mode="mode"
        :service="selected"
        :name="name"
        :base-url="baseUrl"
        :make-default="makeDefault"
        :form-error="formError"
        :dirty="isDirty"
        :testing="formTesting"
        :draft-result="effectiveDraft"
        :url-stale="urlStale"
        :can-delete="canDelete"
        @update:name="name = $event"
        @update:base-url="baseUrl = $event"
        @update:make-default="makeDefault = $event"
        @save="onSubmit"
        @cancel="cancelForm"
        @remove="editingId && requestDelete(editingId)"
        @test="onTest"
        @open-site="openServiceSite(baseUrl)"
      />

      <div
        v-else
        class="flex items-center justify-center rounded-[12px] border border-dashed border-pn-border bg-pn-bg px-6 py-16 text-sm text-pn-text-sub"
      >
        {{ t('options.emptyEditorHint') }}
      </div>
    </div>

    <ServiceDeleteDialog
      :open="deleteTargetId != null"
      :note-count="deleteNoteCount"
      :is-last-service="isLastService"
      @cancel="deleteTargetId = null"
      @confirm="confirmDelete"
    />

    <AppDialog
      :open="discardOpen"
      :title="t('options.discardUnsavedTitle')"
      :body="t('options.discardUnsavedBody')"
      :confirm-label="t('options.discardChanges')"
      confirm-variant="danger"
      @cancel="cancelDiscard"
      @confirm="confirmDiscard"
    />
  </section>
</template>
