/** Inject a short-lived toast into a tab (requires activeTab + scripting). */
export async function injectToast(
  tabId: number,
  message: string,
  kind: 'ok' | 'error' = 'ok',
): Promise<void> {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      func: (msg: string, toastKind: 'ok' | 'error') => {
        const existing = document.getElementById('plainnote-toast-root');
        existing?.remove();
        const root = document.createElement('div');
        root.id = 'plainnote-toast-root';
        root.setAttribute('role', 'status');
        root.textContent = msg;
        Object.assign(root.style, {
          position: 'fixed',
          zIndex: '2147483647',
          right: '16px',
          bottom: '16px',
          maxWidth: '320px',
          padding: '10px 14px',
          borderRadius: '8px',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
          fontSize: '13px',
          lineHeight: '1.4',
          color: '#fff',
          background: toastKind === 'error' ? '#dc2626' : '#1f2328',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          opacity: '0',
          transition: 'opacity 160ms ease',
          pointerEvents: 'none',
        } as CSSStyleDeclaration);
        document.documentElement.appendChild(root);
        requestAnimationFrame(() => {
          root.style.opacity = '1';
        });
        window.setTimeout(() => {
          root.style.opacity = '0';
          window.setTimeout(() => root.remove(), 200);
        }, 2200);
      },
      args: [message, kind],
    });
  } catch {
    // Restricted pages (chrome://, Web Store, etc.)
  }
}

/** Read selection + page meta from the active tab when selectionText is empty. */
export async function injectPageContext(
  tabId: number,
): Promise<{ title: string; url: string; selection: string } | null> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: () => ({
        title: document.title || '',
        url: location.href,
        selection: window.getSelection()?.toString() ?? '',
      }),
    });
    const value = results?.[0]?.result;
    if (!value || typeof value !== 'object') return null;
    return value as { title: string; url: string; selection: string };
  } catch {
    return null;
  }
}
