/** Open the full-page notes workbench in a new tab (or focus an existing one). */
export async function openWorkbenchTab(focusLocalId?: number): Promise<void> {
  const url = browser.runtime.getURL('/app.html');
  if (focusLocalId != null) {
    await browser.storage.session.set({
      'plainnote.focusNoteId': focusLocalId,
    });
  }

  const tabs = await browser.tabs.query({ url: [`${url}*`, url] }).catch(() => []);
  const existing = tabs.find((t) => t.id != null && t.url?.startsWith(url));
  if (existing?.id != null) {
    await browser.tabs.update(existing.id, { active: true });
    if (existing.windowId != null) {
      await browser.windows.update(existing.windowId, { focused: true }).catch(() => undefined);
    }
    if (focusLocalId != null) {
      try {
        await browser.runtime.sendMessage({ type: 'PLAINNOTE_FOCUS_NOTE', localId: focusLocalId });
      } catch {
        // workbench may still be loading
      }
    }
    return;
  }

  await browser.tabs.create({ url });
}
