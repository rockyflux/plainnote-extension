const DETACHED_POPUP = {
  width: 460,
  height: 640,
} as const;

/** Open the action Popup (快速记录). Falls back to a detached window when openPopup is unavailable. */
export async function openActionPopup(): Promise<void> {
  try {
    if (browser.action?.openPopup) {
      await browser.action.openPopup();
      return;
    }
  } catch {
    // Context / browser may reject openPopup — use a floating window instead.
  }

  await openDetachedPopup();
}

/** Open Popup as a standalone browser window (not the toolbar action popup). */
export async function openDetachedPopup(): Promise<void> {
  const url = browser.runtime.getURL('/popup.html?detached=1');
  await browser.windows.create({
    url,
    type: 'popup',
    width: DETACHED_POPUP.width,
    height: DETACHED_POPUP.height,
    focused: true,
  });
}

export function isDetachedPopup(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).has('detached');
  } catch {
    return false;
  }
}
