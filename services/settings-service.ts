import {
  DEFAULT_SETTINGS,
  type ExtensionSettings,
  type LanguagePreference,
  type NoteFormat,
  type ThemePreference,
} from '@/types';
import { ensureDatabaseSeeded } from '@/repositories/db';
import { settingsRepository } from '@/repositories/settings-repository';
import { servicesRepository } from '@/repositories/services-repository';
import { themeService } from '@/services/theme-service';

export async function loadSettings(): Promise<ExtensionSettings> {
  await ensureDatabaseSeeded();
  await settingsRepository.migrateFromBrowserStorageIfNeeded();
  const settings = await settingsRepository.getAll();

  const defaultService = await servicesRepository.getDefault();
  if (defaultService && defaultService.id !== settings.defaultServiceId) {
    const synced = { ...settings, defaultServiceId: defaultService.id };
    await settingsRepository.save(synced);
    return synced;
  }

  return settings;
}

export async function saveSettings(settings: ExtensionSettings): Promise<ExtensionSettings> {
  await ensureDatabaseSeeded();
  const saved = await settingsRepository.save({
    ...DEFAULT_SETTINGS,
    ...settings,
    defaultServiceId: settings.defaultServiceId || DEFAULT_SETTINGS.defaultServiceId,
  });
  themeService.apply(saved.theme);
  themeService.watchSystem(saved.theme);
  return saved;
}

export async function patchSettings(
  patch: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> {
  const current = await loadSettings();
  return saveSettings({ ...current, ...patch });
}

export async function resetSettingsToDefaults(): Promise<ExtensionSettings> {
  const current = await loadSettings();
  return saveSettings({
    ...DEFAULT_SETTINGS,
    // Keep the active default service binding for new notes.
    defaultServiceId: current.defaultServiceId || DEFAULT_SETTINGS.defaultServiceId,
  });
}

export async function setLanguage(language: LanguagePreference): Promise<ExtensionSettings> {
  return patchSettings({ language });
}

export async function setTheme(theme: ThemePreference): Promise<ExtensionSettings> {
  return patchSettings({ theme });
}

export async function setDefaultServiceId(defaultServiceId: string): Promise<ExtensionSettings> {
  await ensureDatabaseSeeded();
  await servicesRepository.setDefault(defaultServiceId);
  return patchSettings({ defaultServiceId });
}

export async function setDefaultFormat(defaultFormat: NoteFormat): Promise<ExtensionSettings> {
  return patchSettings({ defaultFormat });
}

export async function setDefaultFolderId(
  defaultFolderId: number | null,
): Promise<ExtensionSettings> {
  return patchSettings({ defaultFolderId });
}

export async function setDefaultTagIds(defaultTagIds: number[]): Promise<ExtensionSettings> {
  return patchSettings({ defaultTagIds });
}

export async function setAutoSave(
  autoSaveEnabled: boolean,
  autoSaveIntervalMs?: number,
): Promise<ExtensionSettings> {
  return patchSettings({
    autoSaveEnabled,
    ...(autoSaveIntervalMs != null ? { autoSaveIntervalMs } : {}),
  });
}

export async function setMarkdownPreviewDefault(
  markdownPreviewDefault: boolean,
): Promise<ExtensionSettings> {
  return patchSettings({
    markdownPreviewDefault,
    editorViewMode: markdownPreviewDefault ? 'preview' : 'edit',
  });
}
