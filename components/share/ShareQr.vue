<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import QRCode from 'qrcode';

const props = defineProps<{
  url: string;
  size?: number;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
const error = ref('');

async function render() {
  if (!canvas.value || !props.url) return;
  error.value = '';
  try {
    await QRCode.toCanvas(canvas.value, props.url, {
      width: props.size ?? 160,
      margin: 1,
      color: { dark: '#1f2328', light: '#ffffff' },
    });
  } catch (e) {
    error.value = String(e);
  }
}

onMounted(() => {
  void render();
});

watch(
  () => props.url,
  () => {
    void render();
  },
);
</script>

<template>
  <div class="flex flex-col items-center gap-1">
    <canvas ref="canvas" class="rounded border border-pn-border bg-white" />
    <p v-if="error" class="text-[11px] text-pn-danger">{{ error }}</p>
  </div>
</template>
