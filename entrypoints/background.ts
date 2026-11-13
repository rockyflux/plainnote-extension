import { resolveLocale } from '@/utils/locale';
import { loadSettings } from '@/services/settings-service';
import { clipperService } from '@/services/clipper-service';
import { apiErrorI18nKey } from '@/utils/api-error';
import { ensureDatabaseSeeded } from '@/repositories/db';
import { ensureHostPermission } from '@/utils/host-permissions';
import { injectPageContext, injectToast } from '@/utils/page-inject';
import { COMMAND_IDS } from '@/utils/constants';
import { openWorkbenchTab } from '@/utils/open-workbench';
import { openActionPopup } from '@/utils/open-popup';
import { sanitizeClipText } from '@/utils/clip-format';
import en from '@/locales/en.json';
import zhCN from '@/locales/zh-CN.json';

type MessageTree = typeof en;
type MenuKey = keyof MessageTree['contextMenu'];

const MENU_IDS = {
  shareNote: 'plainnote-share-note',
  openSidePanel: 'plainnote-open-sidepanel',
  openWorkbench: 'plainnote-open-workbench',
} as const;

let busyUntil = 0;

function pickMessages(locale: 'en' | 'zh-CN'): MessageTree {
  return locale === 'zh-CN' ? zhCN : en;
}

async function tMenu(key: MenuKey): Promise<string> {
  const settings = await loadSettings();
  const locale = resolveLocale(settings.language);
  return pickMessages(locale).contextMenu[key];
}

async function tToast(key: string): Promise<string> {
  const settings = await loadSettings();
  const locale = resolveLocale(settings.language);
  const messages = pickMessages(locale) as Record<string, unknown>;
  const parts = key.split('.');
  let cur: unknown = messages;
  for (const part of parts) {
    if (cur && typeof cur === 'object' && part in (cur as object)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof cur === 'string' ? cur : key;
}

async function rebuildContextMenus() {
  await browser.contextMenus.removeAll();
  // Single page/selection item → Chrome shows it top-level (no extension submenu).
  await browser.contextMenus.create({
    id: MENU_IDS.shareNote,
    title: await tMenu('shareNote'),
    contexts: ['page', 'selection'],
  });
  await browser.contextMenus.create({
    id: MENU_IDS.openWorkbench,
    title: await tMenu('openWorkbench'),
    contexts: ['action'],
  });
  await browser.contextMenus.create({
    id: MENU_IDS.openSidePanel,
    title: await tMenu('openSidePanel'),
    contexts: ['action'],
  });
}

async function getPageContext(
  tab: { id?: number; title?: string; url?: string } | undefined,
  selectionFallback = '',
) {
  const title = tab?.title ?? '';
  const url = tab?.url ?? '';
  let selection = selectionFallback.trim();

  if (tab?.id != null && (!selection || !title || !url)) {
    const injected = await injectPageContext(tab.id);
    if (injected) {
      return {
        title: injected.title || title,
        url: injected.url || url,
        selection: (injected.selection || selection).trim(),
      };
    }
  }

  return { title, url, selection };
}

async function toastOnTab(tabId: number | undefined, message: string, kind: 'ok' | 'error' = 'ok') {
  if (tabId == null) return;
  await injectToast(tabId, message, kind);
}

async function openSidePanelForTab(tab?: { windowId?: number }) {
  try {
    const windowId = tab?.windowId ?? (await browser.windows.getCurrent()).id;
    if (windowId != null && browser.sidePanel?.open) {
      await browser.sidePanel.open({ windowId });
      return;
    }
  } catch {
    // Firefox / unsupported
  }
  // Fallback: open full workbench when sidePanel API is unavailable.
  await openWorkbenchTab();
}

async function openPopupFallback() {
  // Commands cannot open the action popup reliably; open side panel for quick create UX.
  await openSidePanelForTab();
}

async function withBusy<T>(fn: () => Promise<T>): Promise<T | undefined> {
  const now = Date.now();
  if (now < busyUntil) return undefined;
  busyUntil = now + 1200;
  try {
    return await fn();
  } finally {
    busyUntil = Date.now() + 400;
  }
}

async function handleSaveSelection(
  tab: { id?: number; windowId?: number; title?: string; url?: string } | undefined,
  selectionText: string,
  mode: 'plain' | 'markdown-quote' = 'plain',
) {
  const result = await withBusy(async () => {
    const ctx = await getPageContext(tab, selectionText);
    if (!ctx.selection) throw new Error('NO_SELECTION');
    await clipperService.createFromSelection({
      selection: ctx.selection,
      pageTitle: ctx.title,
      pageUrl: ctx.url,
      mode,
    });
    await clipperService.notifyNotesChanged();
    return 'created' as const;
  });

  if (result == null) {
    await toastOnTab(tab?.id, await tToast('toast.busy'), 'error');
    return;
  }
  await toastOnTab(tab?.id, await tToast('toast.clipSaved'));
}

async function handleShareNote(
  tab: { id?: number; windowId?: number; title?: string; url?: string } | undefined,
  selectionText: string,
) {
  const ctx = await getPageContext(tab, selectionText);
  const content = sanitizeClipText(ctx.selection);
  await clipperService.setPendingQuickCapture({
    content,
    createdAt: Date.now(),
  });
  await openActionPopup();
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    // Host permissions are requested on user gestures (add/test service, create/save note).
    void ensureDatabaseSeeded().then(() => rebuildContextMenus());
  });

  browser.runtime.onStartup.addListener(() => {
    void ensureDatabaseSeeded().then(() => rebuildContextMenus());
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes['plainnote.settings']) {
      void rebuildContextMenus();
    }
  });

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === 'PLAINNOTE_NOTES_CHANGED' || message?.type === 'PLAINNOTE_FOCUS_NOTE') {
      return Promise.resolve({ ok: true });
    }
    if (message?.type === 'PLAINNOTE_REQUEST_HOST' && typeof message.baseUrl === 'string') {
      return ensureHostPermission(message.baseUrl).then((ok) => ({ ok }));
    }
    return undefined;
  });

  browser.commands?.onCommand.addListener((command) => {
    void (async () => {
      await ensureDatabaseSeeded();
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

      if (command === COMMAND_IDS.openSidePanel) {
        await openSidePanelForTab(tab);
        return;
      }

      if (command === COMMAND_IDS.quickCreate) {
        await openPopupFallback();
        return;
      }

      if (command === COMMAND_IDS.saveSelection) {
        try {
          await handleSaveSelection(tab, '', 'plain');
        } catch (err) {
          const key =
            err instanceof Error && err.message === 'NO_SELECTION'
              ? 'errors.noSelection'
              : apiErrorI18nKey(err);
          await toastOnTab(tab?.id, await tToast(key), 'error');
        }
      }
    })();
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    void (async () => {
      await ensureDatabaseSeeded();
      const menuId = String(info.menuItemId);

      if (menuId === MENU_IDS.openWorkbench) {
        await openWorkbenchTab();
        return;
      }

      if (menuId === MENU_IDS.openSidePanel) {
        await openSidePanelForTab(tab);
        return;
      }

      if (menuId === MENU_IDS.shareNote) {
        await handleShareNote(tab, info.selectionText ?? '');
        return;
      }
    })().catch(async (err) => {
      const key = apiErrorI18nKey(err);
      await toastOnTab(tab?.id, await tToast(key), 'error');
    });
  });

  browser.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false }).catch(() => {
    // Unsupported environments (e.g. Firefox)
  });
});
