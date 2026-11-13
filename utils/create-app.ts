import { createApp, type App, type Component } from 'vue';
import { createPinia } from 'pinia';
import { i18n } from '@/utils/i18n';
import { useSettingsStore } from '@/stores/settings';
import { useServicesStore } from '@/stores/services';
import { ensureDatabaseSeeded } from '@/repositories/db';
import '@/assets/styles/main.css';

/** Shared Vue app bootstrap for popup / sidepanel / options / app workbench. */
export async function mountApp(root: Component, el: string | Element): Promise<App> {
  const app = createApp(root);
  const pinia = createPinia();
  app.use(pinia);
  app.use(i18n);

  await ensureDatabaseSeeded();

  const settings = useSettingsStore(pinia);
  await settings.hydrate();

  const services = useServicesStore(pinia);
  await services.refresh();

  app.mount(el);
  return app;
}
