<script lang="ts" setup>
import WorkbenchIcon from '@/components/workbench/WorkbenchIcon.vue';

defineProps<{
  /** Match sidebar column width so brand lines up with nav below. */
  wide?: boolean;
}>();
</script>

<template>
  <!-- [Logo] PlainNote [扩展版] / slogan — always horizontal -->
  <div
    class="flex shrink-0 items-center gap-2.5 px-4 py-3"
    :class="wide !== false ? 'w-[220px] min-w-[220px]' : ''"
  >
    <span class="shrink-0 text-pn-accent" aria-hidden="true">
      <WorkbenchIcon name="logo" :size="32" />
    </span>
    <div class="min-w-0 flex-1">
      <div class="flex flex-nowrap items-center gap-1.5">
        <span class="shrink-0 text-[17px] font-bold leading-none tracking-tight text-pn-text">
          {{ $t('workbench.brandName') }}
        </span>
        <span
          class="inline-flex h-[18px] shrink-0 items-center rounded-full bg-pn-accent px-1.5 text-[10px] font-medium leading-none text-white"
        >
          {{ $t('workbench.brandBadge') }}
        </span>
      </div>
      <p class="mt-1 truncate text-[11px] leading-4 text-pn-text-sub">
        {{ $t('workbench.brandSubtitle') }}
      </p>
    </div>
  </div>
</template>
