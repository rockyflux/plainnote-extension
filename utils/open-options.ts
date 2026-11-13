/** Settings center sections that can be deep-linked via `#hash`. */
export type OptionsFocusSection =
  | 'services'
  | 'general'
  | 'editor'
  | 'shortcuts'
  | 'data'
  | 'appearance'
  | 'about'
  | 'backup'
  | 'settings';

function resolveHash(section?: OptionsFocusSection): string {
  if (!section || section === 'settings') return '';
  if (section === 'backup') return 'data';
  return section;
}

/** Open the dedicated Options page in a browser tab (never embed in workbench). */
export async function openOptionsPage(section?: OptionsFocusSection): Promise<void> {
  const base = browser.runtime.getURL('/options.html');
  const hash = resolveHash(section);
  const url = hash ? `${base}#${hash}` : base;

  const tabs = await browser.tabs.query({ url: [`${base}*`, base] }).catch(() => []);
  const existing = tabs.find((t) => t.id != null && (t.url?.startsWith(base) ?? false));

  if (existing?.id != null) {
    await browser.tabs.update(existing.id, { active: true, url });
    if (existing.windowId != null) {
      await browser.windows.update(existing.windowId, { focused: true }).catch(() => undefined);
    }
    return;
  }

  await browser.tabs.create({ url });
}
