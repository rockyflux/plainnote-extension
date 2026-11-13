<script lang="ts" setup>
import PnButton from '@/components/ui/PnButton.vue';
import PopupHeader from '@/components/popup/PopupHeader.vue';
import PopupNoteEditor from '@/components/popup/PopupNoteEditor.vue';
import NoteMetadataSelector from '@/components/popup/NoteMetadataSelector.vue';
import PopupFooter from '@/components/popup/PopupFooter.vue';
import SaveSuccessView from '@/components/popup/SaveSuccessView.vue';
import QuickActionMenu from '@/components/popup/QuickActionMenu.vue';
import { usePopupCapture } from '@/composables/usePopupCapture';
import { useI18n } from 'vue-i18n';
import { isDetachedPopup } from '@/utils/open-popup';

const emit = defineEmits<{
  openSidePanel: [];
  openOptions: [];
  openEditor: [localId: number];
  openWorkbench: [];
  detach: [];
  close: [];
}>();

const { t } = useI18n();
const detached = isDetachedPopup();

const {
  view,
  content,
  serviceId,
  folderId,
  tagIds,
  copyPublicOnSave,
  created,
  busy,
  saving,
  draftStatus,
  ready,
  pageMeta,
  showDiscardDialog,
  showTagPicker,
  charCount,
  serviceName,
  badgeKey,
  modKey,
  canDetach,
  enterCreate,
  enterClip,
  enterSavePage,
  detachToWindow,
  onSave,
  onCancel,
  continueNew,
  openCreatedNote,
  removeTag,
  keepDraftAndClose,
  discardDraftAndClose,
} = usePopupCapture(emit);

function stayEditing() {
  showDiscardDialog.value = false;
}
</script>

<template>
  <div
    class="flex min-h-0 flex-col"
    :class="detached ? 'h-full' : ''"
  >
    <PopupHeader
      v-if="view !== 'success'"
      class="shrink-0"
      :badge-key="view === 'menu' ? undefined : badgeKey"
      :show-badge="view !== 'menu'"
      :show-detach="canDetach"
      @detach="detachToWindow"
      @open-workbench="emit('openWorkbench')"
      @open-options="emit('openOptions')"
      @close="emit('close')"
    />

    <div v-if="!ready" class="p-6 text-center text-sm text-pn-text-sub">
      {{ t('common.loading') }}
    </div>

    <template v-else-if="view === 'menu'">
      <QuickActionMenu
        @new-note="enterCreate({ fresh: true })"
        @clip="enterClip()"
        @save-page="enterSavePage()"
        @open-workbench="emit('openWorkbench')"
      />
    </template>

    <template v-else-if="view === 'success' && created">
      <SaveSuccessView
        :note="created"
        :service-name="serviceName"
        @again="continueNew"
        @open-note="openCreatedNote"
        @open-workbench="emit('openWorkbench')"
      />
    </template>

    <template v-else-if="view === 'create' || view === 'clip'">
      <div
        class="flex min-h-0 flex-col"
        :class="detached ? 'flex-1' : ''"
      >
        <div
          class="space-y-3 overflow-auto p-4"
          :class="
            detached
              ? 'flex min-h-0 flex-1 flex-col'
              : 'max-h-[520px]'
          "
        >
          <PopupNoteEditor
            v-model="content"
            :char-count="charCount"
            :draft-status="draftStatus"
            :fill="detached"
            :class="detached ? 'min-h-0 flex-1' : ''"
          />

          <div
            v-if="view === 'clip' && pageMeta"
            class="shrink-0 rounded-[8px] border border-pn-border bg-pn-bg-sub px-3 py-2 text-[11px] text-pn-text-sub"
          >
            <div class="truncate font-medium text-pn-text">
              {{ pageMeta.title || t('popup.untitledPage') }}
            </div>
            <div class="truncate">{{ pageMeta.url }}</div>
          </div>

          <NoteMetadataSelector
            class="shrink-0"
            v-model:service-id="serviceId"
            v-model:folder-id="folderId"
            v-model:tag-ids="tagIds"
            v-model:show-tag-picker="showTagPicker"
            @remove-tag="removeTag"
          />
        </div>

        <PopupFooter
          class="shrink-0"
          v-model:copy-public-on-save="copyPublicOnSave"
          :busy="busy || saving"
          :show-copy-option="true"
          :mod-key="modKey"
          @cancel="onCancel"
          @save="onSave"
        />
      </div>
    </template>

    <div
      v-if="showDiscardDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-sm space-y-4 rounded-[8px] border border-pn-border bg-pn-bg p-4">
        <h2 class="text-base font-semibold text-pn-text">{{ t('popup.discardDraftTitle') }}</h2>
        <p class="text-sm text-pn-text-sub whitespace-pre-wrap">{{ t('popup.discardDraftBody') }}</p>
        <div class="flex flex-wrap justify-end gap-2">
          <PnButton variant="ghost" size="sm" @click="stayEditing">
            {{ t('common.cancel') }}
          </PnButton>
          <PnButton variant="secondary" size="sm" @click="discardDraftAndClose">
            {{ t('popup.discardDraft') }}
          </PnButton>
          <PnButton variant="primary" size="sm" @click="keepDraftAndClose">
            {{ t('popup.keepDraft') }}
          </PnButton>
        </div>
      </div>
    </div>
  </div>
</template>
