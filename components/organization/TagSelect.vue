<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import PnButton from '@/components/ui/PnButton.vue';
import PnInput from '@/components/ui/PnInput.vue';
import { useOrganizationStore } from '@/stores/organization';

const props = defineProps<{
  modelValue: number[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number[]];
}>();

const { t } = useI18n();
const org = useOrganizationStore();
const { tags } = storeToRefs(org);
const newName = ref('');
const creating = ref(false);

const selected = computed(() => new Set(props.modelValue));

onMounted(() => {
  void org.refresh();
});

function toggle(id: number) {
  const next = new Set(props.modelValue);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  emit('update:modelValue', [...next]);
}

async function addTag() {
  const name = newName.value.trim();
  if (!name) return;
  creating.value = true;
  try {
    const id = await org.createTag(name);
    newName.value = '';
    emit('update:modelValue', [...props.modelValue, id]);
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="space-y-1.5">
    <div class="text-xs font-medium text-pn-text-sub">{{ t('organization.tags') }}</div>
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="tag in tags"
        :key="tag.id"
        type="button"
        class="rounded-[8px] border px-2 py-1 text-xs transition-colors"
        :class="
          tag.id != null && selected.has(tag.id)
            ? 'border-pn-accent bg-pn-accent-soft text-pn-accent'
            : 'border-pn-border bg-pn-bg text-pn-text-sub hover:bg-pn-bg-sub'
        "
        @click="tag.id != null && toggle(tag.id)"
      >
        {{ tag.name }}
      </button>
      <span v-if="tags.length === 0" class="text-xs text-pn-text-sub">
        {{ t('organization.noTags') }}
      </span>
    </div>
    <div class="flex gap-1.5">
      <PnInput
        v-model="newName"
        :placeholder="t('organization.newTagPlaceholder')"
        class="flex-1"
      />
      <PnButton variant="secondary" size="sm" :disabled="creating" @click="addTag">
        {{ t('organization.add') }}
      </PnButton>
    </div>
  </div>
</template>
