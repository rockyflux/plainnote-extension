<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { MAX_TITLE_LENGTH } from '@/utils/constants';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { t } = useI18n();

const tooLong = computed(() => [...props.modelValue].length > MAX_TITLE_LENGTH);

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
}
</script>

<template>
  <div>
    <input
      :value="modelValue"
      type="text"
      class="pn-focus-ring w-full rounded-[8px] border bg-pn-bg px-3 py-2 text-sm text-pn-text placeholder:text-[#c0c5cc]"
      :class="tooLong ? 'border-pn-danger' : 'border-pn-border'"
      :placeholder="t('editor.titlePlaceholder')"
      :aria-label="t('popup.titleLabel')"
      :maxlength="MAX_TITLE_LENGTH + 20"
      @input="onInput"
    />
    <p v-if="tooLong" class="mt-1 text-[11px] text-pn-danger">
      {{ t('popup.titleTooLong') }}
    </p>
  </div>
</template>
