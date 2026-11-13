import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  DEFAULT_SETTINGS,
  type ExtensionSettings,
  type LanguagePreference,
  type NoteFormat,
  type ResolvedLocale,
  type ResolvedTheme,
  type ThemePreference,
} from '@/types';
import {
  loadSettings,
  resetSettingsToDefaults,
  saveSettings,
} from '@/services/settings-service';
import { applyLocale } from '@/utils/i18n';
import { resolveLocale } from '@/utils/locale';
import { ensureDatabaseSeeded } from '@/repositories/db';
import { themeService } from '@/services/theme-service';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<ExtensionSettings>({ ...DEFAULT_SETTINGS });
  const ready = ref(false);

  const resolvedLocale = computed<ResolvedLocale>(() =>
    resolveLocale(settings.value.language),
  );

  const resolvedTheme = computed<ResolvedTheme>(() =>
    themeService.resolve(settings.value.theme),
  );

  function applyChrome(next: ExtensionSettings) {
    applyLocale(next.language);
    themeService.apply(next.theme);
    themeService.watchSystem(next.theme);
  }

  async function hydrate() {
    await ensureDatabaseSeeded();
    settings.value = await loadSettings();
    applyChrome(settings.value);
    ready.value = true;
  }

  async function persist(next: ExtensionSettings) {
    settings.value = await saveSettings(next);
    applyChrome(settings.value);
    return settings.value;
  }

  async function setLanguage(language: LanguagePreference) {
    await persist({ ...settings.value, language });
  }

  async function setTheme(theme: ThemePreference) {
    await persist({ ...settings.value, theme });
  }

  async function setDefaultServiceId(defaultServiceId: string) {
    await persist({ ...settings.value, defaultServiceId });
  }

  async function updatePreferences(patch: Partial<ExtensionSettings>) {
    await persist({ ...settings.value, ...patch });
  }

  async function resetToDefaults() {
    settings.value = await resetSettingsToDefaults();
    applyChrome(settings.value);
    return settings.value;
  }

  async function setDefaultFormat(defaultFormat: NoteFormat) {
    await updatePreferences({ defaultFormat });
  }

  async function setDefaultFolderId(defaultFolderId: number | null) {
    await updatePreferences({ defaultFolderId });
  }

  async function setDefaultTagIds(defaultTagIds: number[]) {
    await updatePreferences({ defaultTagIds });
  }

  async function setAutoSave(autoSaveEnabled: boolean, autoSaveIntervalMs?: number) {
    await updatePreferences({
      autoSaveEnabled,
      ...(autoSaveIntervalMs != null ? { autoSaveIntervalMs } : {}),
    });
  }

  async function setMarkdownPreviewDefault(markdownPreviewDefault: boolean) {
    await updatePreferences({
      markdownPreviewDefault,
      editorViewMode: markdownPreviewDefault ? 'preview' : 'edit',
    });
  }

  /** @deprecated Use servicesService / setDefaultServiceId — kept for older call sites. */
  async function setServerBaseUrl(_serverBaseUrl: string) {
    return settings.value;
  }

  return {
    settings,
    ready,
    resolvedLocale,
    resolvedTheme,
    hydrate,
    setLanguage,
    setTheme,
    setDefaultServiceId,
    updatePreferences,
    resetToDefaults,
    setDefaultFormat,
    setDefaultFolderId,
    setDefaultTagIds,
    setAutoSave,
    setMarkdownPreviewDefault,
    setServerBaseUrl,
  };
});
