# PlainNote Extension

Independent browser extension for [PlainNote](https://github.com/rockyflux/PlainNote).

- **Repo:** `rockyflux/plainnote-extension` (separate from PlainNote)
- **Stack:** WXT · TypeScript · Vue 3 · Tailwind CSS · Dexie · vue-i18n · CodeMirror 6
- **Default server:** https://plainshare-one.vercel.app

This project talks to PlainNote only over HTTP REST. It does not modify the PlainNote codebase.

## Features

- Quick capture (Popup), Side Panel workbench, Options settings center
- Multi-service PlainNote origins with per-note binding
- Local folders, tags, favorites, search, drafts
- Three-link share: public Note / Raw; private Edit with confirm
- Context menus + Commands API shortcuts
- JSON backup import/export (secrets acknowledged by user)

## Install (developer / sideload)

### Chrome / Microsoft Edge (recommended)

1. `npm install && npm run build` (or use the zip below)
2. Open `chrome://extensions` or `edge://extensions`
3. Enable **Developer mode**
4. **Load unpacked** → select `.output/chrome-mv3`
5. Or drag ` .output/plainnote-extension-0.1.0-chrome.zip` after unpacking

Edge uses the same Chromium MV3 package as Chrome.

### Firefox (preview)

1. `npm run build:firefox` or use `.output/plainnote-extension-0.1.0-firefox.zip`
2. `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → pick `manifest.json` under `.output/firefox-mv2`
3. Side panel maps to Firefox **sidebar**; host access uses optional permissions
4. Store submission needs extra Firefox consent / host checks — treat as preview until verified

## Development

```bash
npm install
npm run dev          # Chromium + HMR
npm run dev:firefox  # Firefox
npm run compile      # vue-tsc
npm test             # Vitest
```

## Build & pack

```bash
npm run build           # → .output/chrome-mv3
npm run build:firefox   # → .output/firefox-mv2
npm run zip             # → .output/plainnote-extension-0.1.0-chrome.zip
npm run zip:firefox     # → .output/plainnote-extension-0.1.0-firefox.zip (+ sources.zip)
```

## Permissions

| Permission | Why |
|---|---|
| `storage` | Settings mirror for background menus |
| `sidePanel` | Chromium side panel workbench |
| `contextMenus` | Selection / page clip |
| `activeTab` | Read current tab on user gesture |
| `scripting` | On-demand toast / page context inject (no always-on content script) |
| `clipboardWrite` | Copy share links on user action |
| **optional** `http(s)://*/*` | Only origins the user adds/tests/uses as PlainNote servers |

Secrets (`editUrl` / `secret`) stay in IndexedDB; share history never stores Edit URLs.

## i18n

- UI: `locales/en.json`, `locales/zh-CN.json`
- Manifest: `public/_locales/en`, `public/_locales/zh_CN`
- Preference: follow browser · 简体中文 · English

## Verification

```bash
npm run compile && npm test && npm run build
node scripts/verify-settings-center.mjs
node scripts/verify-share-links.mjs
```
