import { ref } from 'vue';

const message = ref('');
const visible = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

export function useToast() {
  function show(text: string, durationMs = 1800) {
    message.value = text;
    visible.value = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      visible.value = false;
    }, durationMs);
  }

  return {
    message,
    visible,
    show,
  };
}
