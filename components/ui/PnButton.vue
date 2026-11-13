<script lang="ts" setup>
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    block?: boolean;
    size?: 'sm' | 'md';
  }>(),
  {
    variant: 'secondary',
    type: 'button',
    disabled: false,
    block: false,
    size: 'md',
  },
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center gap-1.5 rounded-[8px] border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    :class="[
      block ? 'w-full' : '',
      size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
      variant === 'primary'
        ? 'border-pn-accent bg-pn-accent text-white hover:bg-[#1d4ed8]'
        : '',
      variant === 'secondary'
        ? 'border-pn-border bg-pn-bg text-pn-text hover:bg-pn-bg-sub'
        : '',
      variant === 'ghost'
        ? 'border-transparent bg-transparent text-pn-text-sub hover:bg-pn-bg-sub hover:text-pn-text'
        : '',
      variant === 'danger'
        ? 'border-pn-danger-border bg-pn-bg text-pn-danger hover:bg-[#fef2f2]'
        : '',
    ]"
  >
    <slot />
  </button>
</template>
