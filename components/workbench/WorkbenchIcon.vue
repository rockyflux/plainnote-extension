<script lang="ts" setup>
/**
 * Stroke icons matching the workbench mock (24×24 viewBox, 1.75 weight).
 */
export type WorkbenchIconName =
  | 'logo'
  | 'plus'
  | 'all'
  | 'star'
  | 'clock'
  | 'trash'
  | 'folder'
  | 'chevron'
  | 'sync'
  | 'settings'
  | 'close'
  | 'heading'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'link'
  | 'image'
  | 'list'
  | 'ordered'
  | 'quote'
  | 'codeBlock'
  | 'table'
  | 'more'
  | 'edit'
  | 'preview'
  | 'split'
  | 'expand'
  | 'check'
  | 'search'
  | 'cloud'
  | 'tag'
  | 'share'
  | 'grid'
  | 'filter'
  | 'undo'
  | 'redo'
  | 'lang'
  | 'service'
  | 'chevronDown'
  | 'external'
  | 'popout'
  | 'globe'
  | 'lock'
  | 'document'
  | 'quoteMark'
  | 'workbench'
  | 'text'
  | 'markdown';

defineProps<{
  name: WorkbenchIconName;
  size?: number;
}>();
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size ?? 16"
    :height="size ?? 16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
  >
    <template v-if="name === 'logo'">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="currentColor" stroke="none" />
      <path
        d="M8 15.2l7.6-7.6a1.2 1.2 0 0 1 1.7 1.7L9.7 16.9H8v-1.7z"
        stroke="#fff"
        stroke-width="1.6"
        fill="none"
      />
      <path d="M14.8 8.4l1.7 1.7" stroke="#fff" stroke-width="1.6" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'all'">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </template>
    <template v-else-if="name === 'star'">
      <path
        d="M12 3.5l2.4 4.85 5.35.78-3.87 3.77.91 5.32L12 15.7l-4.79 2.52.91-5.32L4.25 9.13l5.35-.78L12 3.5z"
      />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.5" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M4 7h16M9 7V5h6v2M8 7l.8 12h6.4L16 7" />
    </template>
    <template v-else-if="name === 'folder'">
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7H9l2 2h8.5A1.5 1.5 0 0 1 21 10.5v7A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9z" />
    </template>
    <template v-else-if="name === 'chevron'">
      <path d="M9 6l6 6-6 6" />
    </template>
    <template v-else-if="name === 'sync'">
      <path d="M4 12a8 8 0 0 1 13.5-5.8L20 4v6h-6" />
      <path d="M20 12a8 8 0 0 1-13.5 5.8L4 20v-6h6" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 3.5v2.2M12 18.3V20.5M4.9 6.5l1.55 1.55M17.55 15.95l1.55 1.55M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.55-1.55M17.55 8.05l1.55-1.55"
      />
    </template>
    <template v-else-if="name === 'close'">
      <path d="M7 7l10 10M17 7L7 17" />
    </template>
    <template v-else-if="name === 'heading'">
      <path d="M6 5v14M18 5v14M6 12h12" />
    </template>
    <template v-else-if="name === 'bold'">
      <path d="M7 5h6.5a3.5 3.5 0 0 1 0 7H7V5zm0 7h7.5a3.5 3.5 0 0 1 0 7H7v-7z" />
    </template>
    <template v-else-if="name === 'italic'">
      <path d="M12 5h5M7 19h5M14.5 5l-5 14" />
    </template>
    <template v-else-if="name === 'strike'">
      <path d="M6 12h12M8 7.5C8.5 6 10 5 12.2 5c2.4 0 4 1.1 4 2.8 0 .9-.4 1.6-1.1 2.1M7.5 14.2c.4 2.2 2.2 3.3 4.7 3.3 2.6 0 4.3-1.3 4.3-3.2" />
    </template>
    <template v-else-if="name === 'code'">
      <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
    </template>
    <template v-else-if="name === 'link'">
      <path d="M9.5 14.5l5-5" />
      <path d="M11 17l-1.2 1.2a3.5 3.5 0 0 1-5-5L6 12" />
      <path d="M13 7l1.2-1.2a3.5 3.5 0 0 1 5 5L18 12" />
    </template>
    <template v-else-if="name === 'image'">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M4 16l4.5-4.5L13 16l3-3 4 4" />
    </template>
    <template v-else-if="name === 'list'">
      <path d="M9 7h11M9 12h11M9 17h11M5 7h.01M5 12h.01M5 17h.01" />
    </template>
    <template v-else-if="name === 'ordered'">
      <path d="M10 7h10M10 12h10M10 17h10M5 6.5V9h1.5M5 12.5h2l-2 2.5h2M5 17.5h2" />
    </template>
    <template v-else-if="name === 'quote'">
      <path d="M8 17h3l2-5V7H7v5h3l-2 5zm8 0h3l2-5V7h-6v5h3l-2 5z" />
    </template>
    <template v-else-if="name === 'codeBlock'">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M9 10l-2 2 2 2M15 10l2 2-2 2M12.5 9.5l-1 5" />
    </template>
    <template v-else-if="name === 'table'">
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
      <path d="M4 10h16M4 14h16M10 5v14M14 5v14" />
    </template>
    <template v-else-if="name === 'more'">
      <circle cx="6" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'edit'">
      <path d="M5 19h14M7 15.5l8.5-8.5 2.5 2.5L9.5 18H7v-2.5z" />
    </template>
    <template v-else-if="name === 'preview'">
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </template>
    <template v-else-if="name === 'split'">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M12 5v14" />
    </template>
    <template v-else-if="name === 'expand'">
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.25" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16.5 16.5L21 21" />
    </template>
    <template v-else-if="name === 'cloud'">
      <path
        d="M7.5 18h9.2A4.3 4.3 0 0 0 18 9.7 6 6 0 0 0 7.1 8.2 3.8 3.8 0 0 0 7.5 18z"
      />
    </template>
    <template v-else-if="name === 'tag'">
      <path d="M20 13.5L12.5 21a1.5 1.5 0 0 1-2.1 0L3 13.6V4h9.6L20 11.4a1.5 1.5 0 0 1 0 2.1z" />
      <circle cx="8.2" cy="8.2" r="1.2" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'share'">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.3 13.2l7.4 4.1M15.7 6.7l-7.4 4.1" />
    </template>
    <template v-else-if="name === 'grid'">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </template>
    <template v-else-if="name === 'filter'">
      <path d="M4 6h16l-6 7.5V19l-4 1.5v-7L4 6z" />
    </template>
    <template v-else-if="name === 'undo'">
      <path d="M9 14H5V10" />
      <path d="M5 10a7 7 0 1 1 2 5.3" />
    </template>
    <template v-else-if="name === 'redo'">
      <path d="M15 14h4V10" />
      <path d="M19 10a7 7 0 1 0-2 5.3" />
    </template>
    <template v-else-if="name === 'lang'">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.8 3.8 5.6 3.8 8.5S14.5 17.7 12 20.5M12 3.5C9.5 6.3 8.2 9.1 8.2 12S9.5 17.7 12 20.5" />
    </template>
    <template v-else-if="name === 'service'">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16M9 14h6" />
    </template>
    <template v-else-if="name === 'chevronDown'">
      <path d="M6 9l6 6 6-6" />
    </template>
    <template v-else-if="name === 'external'">
      <path d="M14 4h6v6" />
      <path d="M10 14L20 4" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </template>
    <template v-else-if="name === 'popout'">
      <rect x="3" y="8" width="13" height="13" rx="1.5" />
      <path d="M10 3h11v11" />
      <path d="M21 3l-8 8" />
    </template>
    <template v-else-if="name === 'globe'">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.8 2.6 4.2 5.4 4.2 8.5S14.8 17.9 12 20.5M12 3.5C9.2 6.1 7.8 8.9 7.8 12S9.2 17.9 12 20.5" />
    </template>
    <template v-else-if="name === 'lock'">
      <rect x="6" y="11" width="12" height="9" rx="1.5" />
      <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" />
    </template>
    <template v-else-if="name === 'document'">
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
      <path d="M14 3.5V8h4.5M9 12h6M9 16h6" />
    </template>
    <template v-else-if="name === 'quoteMark'">
      <path d="M8 17h3l2-5V7H7v5h3l-2 5zm8 0h3l2-5V7h-6v5h3l-2 5z" />
    </template>
    <template v-else-if="name === 'workbench'">
      <rect x="3.5" y="4.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="4.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="17" height="6" rx="1.5" />
    </template>
    <template v-else-if="name === 'text'">
      <path d="M5 6h14M12 6v12M9 18h6" />
    </template>
    <template v-else-if="name === 'markdown'">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M7 14V9l2 2.5L11 9v5M14 14v-3.5l1.5 2L17 10.5V14" />
    </template>
  </svg>
</template>
