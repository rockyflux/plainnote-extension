<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import { DEFAULT_SERVER_BASE_URL } from '@/types';

const { t } = useI18n();
const version = browser.runtime.getManifest().version;

const links = [
  {
    labelKey: 'options.about.github',
    href: 'https://github.com/plainnode-project/plainnote-extension',
  },
  {
    labelKey: 'options.about.officialService',
    href: DEFAULT_SERVER_BASE_URL,
  },
  {
    labelKey: 'options.about.apiDocs',
    href: 'https://github.com/plainnode-project/PlainNote/blob/main/docs/API.md',
  },
  {
    labelKey: 'options.about.license',
    href: 'https://github.com/plainnode-project/plainnote-extension/blob/main/LICENSE',
  },
];
</script>

<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-lg font-bold text-pn-text">{{ t('options.about.title') }}</h2>
      <p class="mt-1 text-sm text-pn-text-sub">{{ t('options.about.subtitle') }}</p>
    </div>

    <div class="rounded-[12px] border border-pn-border bg-pn-bg p-5">
      <div class="flex items-center gap-3">
        <span
          class="flex h-12 w-12 items-center justify-center rounded-[12px] bg-pn-accent text-white"
          aria-hidden="true"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3c-2.8 3.2-6 5.8-6 9.2A6 6 0 0 0 12 18.5a6 6 0 0 0 6-6.3C18 8.8 14.8 6.2 12 3Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <div>
          <div class="text-base font-bold text-pn-text">{{ t('options.brandTitle') }}</div>
          <div class="text-sm text-pn-text-sub">v{{ version }}</div>
        </div>
      </div>
      <p class="mt-4 text-sm leading-relaxed text-pn-text-sub">
        {{ t('options.about.description') }}
      </p>
    </div>

    <ul class="space-y-2">
      <li v-for="link in links" :key="link.href">
        <a
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-between rounded-[10px] border border-pn-border bg-pn-bg px-4 py-3 text-sm text-pn-text transition hover:border-pn-accent/40"
        >
          <span>{{ t(link.labelKey) }}</span>
          <span class="text-pn-text-muted" aria-hidden="true">↗</span>
        </a>
      </li>
    </ul>

    <div class="rounded-[12px] border border-pn-border bg-pn-bg p-4">
      <h3 class="text-sm font-semibold text-pn-text">{{ t('options.about.changelogTitle') }}</h3>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-pn-text-sub">
        <li>{{ t('options.about.changelog1') }}</li>
        <li>{{ t('options.about.changelog2') }}</li>
        <li>{{ t('options.about.changelog3') }}</li>
      </ul>
    </div>

    <p class="text-xs text-pn-text-muted">{{ t('options.about.licenseNote') }}</p>
  </section>
</template>
