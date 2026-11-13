import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

const HOST_OPTIONAL = ['https://*/*', 'http://*/*'] as const;

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: ({ browser }) => {
    const base = {
      name: '__MSG_extName__',
      description: '__MSG_extDescription__',
      default_locale: 'zh_CN' as const,
      permissions: [
        'storage',
        'sidePanel',
        'contextMenus',
        'activeTab',
        'scripting',
        'clipboardWrite',
      ],
      // Chrome MV3 optional hosts; requested per PlainNote origin at runtime.
      optional_host_permissions: [...HOST_OPTIONAL],
      action: {
        default_title: '__MSG_extName__',
      },
      commands: {
        'quick-create': {
          suggested_key: {
            default: 'Alt+Shift+N',
            mac: 'Alt+Shift+N',
          },
          description: '__MSG_cmdQuickCreate__',
        },
        'save-selection': {
          suggested_key: {
            default: 'Alt+Shift+S',
            mac: 'Alt+Shift+S',
          },
          description: '__MSG_cmdSaveSelection__',
        },
        'open-side-panel': {
          suggested_key: {
            default: 'Alt+Shift+P',
            mac: 'Alt+Shift+P',
          },
          description: '__MSG_cmdOpenSidePanel__',
        },
      },
      browser_specific_settings: {
        gecko: {
          id: 'plainnote-extension@rockyflux',
          strict_min_version: '121.0',
        },
      },
    };

    // Firefox MV2 expects optional host patterns under optional_permissions.
    // Chrome types reject host strings there, so only attach for Firefox builds.
    if (browser === 'firefox') {
      return {
        ...base,
        optional_permissions: [...HOST_OPTIONAL] as unknown as never[],
      };
    }
    return base;
  },
});
