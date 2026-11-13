/**
 * Static verification for settings center / permissions / commands.
 * Run after `npm run build`.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
const log = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

function readJson(rel) {
  return JSON.parse(readFileSync(resolve(root, rel), 'utf8'));
}

function main() {
  const manifestPath = '.output/chrome-mv3/manifest.json';
  if (!existsSync(resolve(root, manifestPath))) {
    log('build output present', false, 'run npm run build first');
    process.exit(1);
  }

  const manifest = readJson(manifestPath);
  log('manifest v3', manifest.manifest_version === 3);

  const perms = new Set(manifest.permissions ?? []);
  for (const p of ['storage', 'sidePanel', 'contextMenus', 'activeTab', 'scripting']) {
    log(`permission:${p}`, perms.has(p));
  }
  log('no broad host_permissions', !manifest.host_permissions || manifest.host_permissions.length === 0);
  log(
    'optional_host_permissions present',
    Array.isArray(manifest.optional_host_permissions) &&
      manifest.optional_host_permissions.includes('https://*/*') &&
      manifest.optional_host_permissions.includes('http://*/*'),
  );
  log('no content_scripts in manifest', !manifest.content_scripts);

  const commands = manifest.commands ?? {};
  log('command quick-create', Boolean(commands['quick-create']?.suggested_key?.default === 'Alt+Shift+N'));
  log('command save-selection', Boolean(commands['save-selection']?.suggested_key?.default === 'Alt+Shift+S'));
  log('command open-side-panel', Boolean(commands['open-side-panel']?.suggested_key?.default === 'Alt+Shift+P'));

  log('options_ui page', manifest.options_ui?.page === 'options.html');
  log('side_panel path', manifest.side_panel?.default_path === 'sidepanel.html');
  log('action popup', manifest.action?.default_popup === 'popup.html');

  const en = readJson('locales/en.json');
  const zh = readJson('locales/zh-CN.json');
  const requiredOptionKeys = [
    'defaultsSection',
    'editorPrefsSection',
    'dataSection',
    'exportWarnBody',
    'importWarnBody',
    'clearAllBody',
    'shortcutsCustomizeHint',
  ];
  for (const key of requiredOptionKeys) {
    log(`i18n en options.${key}`, typeof en.options?.[key] === 'string');
    log(`i18n zh options.${key}`, typeof zh.options?.[key] === 'string');
  }
  log('i18n en hostPermissionDenied', typeof en.errors?.hostPermissionDenied === 'string');
  log('i18n zh hostPermissionDenied', typeof zh.errors?.hostPermissionDenied === 'string');
  log('i18n en shortcuts.saveSelection', typeof en.shortcuts?.saveSelection === 'string');
  log('i18n zh shortcuts.saveSelection', typeof zh.shortcuts?.saveSelection === 'string');

  const msgEn = readJson('public/_locales/en/messages.json');
  const msgZh = readJson('public/_locales/zh_CN/messages.json');
  for (const k of ['cmdQuickCreate', 'cmdSaveSelection', 'cmdOpenSidePanel']) {
    log(`manifest i18n en ${k}`, Boolean(msgEn[k]?.message));
    log(`manifest i18n zh ${k}`, Boolean(msgZh[k]?.message));
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main();
