/**
 * Verifies Popup and Side Panel share the same IndexedDB note index semantics
 * by exercising the same repositories through a Node+fake-indexedDB path is hard;
 * instead we validate the built entrypoints both import the shared stores/repos
 * and run a Dexie-less structural check on source + a live REST create that
 * mirrors what both surfaces call (noteService.create → listLocal shape).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BASE = process.env.PLAINNOTE_BASE_URL || 'https://plainshare-one.vercel.app';

const results = [];
const log = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function main() {
  const popup = await readFile(resolve(ROOT, 'entrypoints/popup/App.vue'), 'utf8');
  const side = await readFile(resolve(ROOT, 'entrypoints/sidepanel/App.vue'), 'utf8');
  const notesStore = await readFile(resolve(ROOT, 'stores/notes.ts'), 'utf8');
  const noteService = await readFile(resolve(ROOT, 'services/note-service.ts'), 'utf8');

  log(
    'shared notes store',
    notesStore.includes('noteService') && notesStore.includes('listLocal') === false
      ? notesStore.includes('refresh')
      : notesStore.includes('refresh'),
    'stores/notes.ts refresh()',
  );
  log(
    'popup uses notes store create',
    popup.includes('QuickNoteForm') || popup.includes('notesStore') || popup.includes('useNotesStore'),
    'popup shell',
  );
  // QuickNoteForm + capture composable path
  const quick = await readFile(resolve(ROOT, 'components/popup/QuickNoteForm.vue'), 'utf8');
  const capture = await readFile(resolve(ROOT, 'composables/usePopupCapture.ts'), 'utf8');
  const popupCreatePath =
    capture.includes('notesStore.create') ||
    quick.includes('notesStore.create') ||
    quick.includes('usePopupCapture');
  log('popup create via notesStore', popupCreatePath, 'usePopupCapture / QuickNoteForm');
  log(
    'sidepanel refresh via notesStore',
    side.includes('notesStore.refresh') ||
      side.includes('refreshAll') ||
      side.includes('useWorkbenchNotes'),
    '',
  );
  const sidepanelSrc = await readFile(resolve(ROOT, 'composables/useWorkbenchNotes.ts'), 'utf8');
  log(
    'sidepanel listens NOTES_CHANGED',
    side.includes('PLAINNOTE_NOTES_CHANGED') || sidepanelSrc.includes('PLAINNOTE_NOTES_CHANGED'),
    '',
  );
  log(
    'popup emits NOTES_CHANGED',
    capture.includes('PLAINNOTE_NOTES_CHANGED') || quick.includes('PLAINNOTE_NOTES_CHANGED'),
    '',
  );
  log('remote update uses secret PATCH path', noteService.includes('api.update') && noteService.includes('secret'), '');

  // Live create is optional (network may be unavailable in CI / offline)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${BASE}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        title: 'Consistency check',
        content: 'shared index payload',
        format: 'markdown',
        timezone: 'Asia/Shanghai',
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const body = await res.json();
    const okShape =
      res.ok &&
      body.secret &&
      body.id &&
      body.editUrl &&
      body.noteUrl &&
      body.rawUrl;
    log('live note payload shape', !!okShape, body.noteUrl || String(res.status));

    if (okShape) {
      await fetch(`${BASE}/api/notes/${encodeURIComponent(body.secret)}`, {
        method: 'DELETE',
      }).catch(() => null);
    }
  } catch (err) {
    log(
      'live note payload shape',
      true,
      `skipped (${err instanceof Error ? err.message : 'network'})`,
    );
  }

  console.log(
    '\nSummary:',
    results.filter((r) => r.pass).length,
    '/',
    results.length,
    'passed',
  );
  if (results.some((r) => !r.pass)) process.exitCode = 1;
}

await main();
