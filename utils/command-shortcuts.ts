import { COMMAND_IDS } from '@/utils/constants';

/** Format a Chrome Commands API shortcut for display (e.g. Alt+Shift+N → Alt + Shift + N). */
export function formatCommandShortcut(shortcut?: string | null): string {
  if (!shortcut) return '';
  return shortcut.replace(/Command/g, '⌘').replace(/\+/g, ' + ');
}

/** Live shortcut map for registered extension commands. Empty string = not set. */
export async function loadCommandShortcuts(): Promise<Record<string, string>> {
  const empty: Record<string, string> = {
    [COMMAND_IDS.quickCreate]: '',
    [COMMAND_IDS.saveSelection]: '',
    [COMMAND_IDS.openSidePanel]: '',
  };

  try {
    const all = await browser.commands.getAll();
    const byName = new Map(all.map((c) => [c.name, formatCommandShortcut(c.shortcut ?? '')]));
    return {
      [COMMAND_IDS.quickCreate]: byName.get(COMMAND_IDS.quickCreate) || '',
      [COMMAND_IDS.saveSelection]: byName.get(COMMAND_IDS.saveSelection) || '',
      [COMMAND_IDS.openSidePanel]: byName.get(COMMAND_IDS.openSidePanel) || '',
    };
  } catch {
    return empty;
  }
}
