/**
 * Live three-link share flow: create note, assert URLs, simulate record rules.
 */
const BASE = process.env.PLAINNOTE_BASE_URL || 'https://plainshare-one.vercel.app';

function isEditUrl(url) {
  try {
    return /^\/edit\//i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function isNoteUrl(url) {
  try {
    return /^\/note\//i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function isRawUrl(url) {
  try {
    return /^\/raw\//i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

const results = [];
const log = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function main() {
  let secret = null;
  try {
    const res = await fetch(`${BASE}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        title: 'Share verify',
        content: 'three-link check',
        format: 'markdown',
        timezone: 'Asia/Shanghai',
      }),
    });
    const note = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(note));
    secret = note.secret;

    log('has editUrl', isEditUrl(note.editUrl), note.editUrl.replace(/\/edit\/.*/, '/edit/[REDACTED]'));
    log('has noteUrl', isNoteUrl(note.noteUrl), note.noteUrl);
    log('has rawUrl', isRawUrl(note.rawUrl), note.rawUrl);
    log('edit contains secret path', note.editUrl.includes(note.secret), 'path check');
    log('note/raw use public id', note.noteUrl.includes(note.id) && note.rawUrl.includes(note.id), note.id);

    // Simulate share-record rules (no IndexedDB in Node)
    const assertSafe = (channel, sharedUrl) => {
      if (channel === 'copy-edit-url' && sharedUrl) throw new Error('edit url stored');
      if (sharedUrl && isEditUrl(sharedUrl)) throw new Error('edit path in public channel');
    };
    assertSafe('copy-note-url', note.noteUrl);
    assertSafe('copy-raw-url', note.rawUrl);
    assertSafe('copy-edit-url', null);
    let blocked = false;
    try {
      assertSafe('copy-edit-url', note.editUrl);
    } catch {
      blocked = true;
    }
    log('block edit url in history', blocked);

    // Fetch public note + raw to prove links work
    const pub = await fetch(`${BASE}/api/notes/${encodeURIComponent(note.id)}`);
    log('public note readable', pub.ok, String(pub.status));
    const raw = await fetch(note.rawUrl);
    const rawText = await raw.text();
    log('raw link readable', raw.ok && rawText.includes('three-link'), String(raw.status));

    console.log(
      '\nSummary:',
      results.filter((r) => r.pass).length,
      '/',
      results.length,
      'passed',
    );
    if (results.some((r) => !r.pass)) process.exitCode = 1;
  } catch (err) {
    log('live flow', false, String(err));
    process.exitCode = 1;
  } finally {
    if (secret) {
      await fetch(`${BASE}/api/notes/${encodeURIComponent(secret)}`, { method: 'DELETE' }).catch(
        () => null,
      );
    }
  }
}

await main();
