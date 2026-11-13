/**
 * Live REST verification for quick-capture payloads (no browser chrome).
 * Uses the public default PlainNote instance.
 */
const BASE = process.env.PLAINNOTE_BASE_URL || 'https://plainshare-one.vercel.app';

function formatSelectionQuote(selection, pageTitle, pageUrl) {
  const text = selection.replace(/\r\n/g, '\n').trim();
  const quoted = text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
  const title = (pageTitle || pageUrl || 'Untitled').trim();
  const url = pageUrl.trim();
  const source = url ? `来源：[${title}](${url})` : `来源：${title}`;
  return `${quoted}\n\n${source}`;
}

function formatSelectionPlain(selection, pageTitle, pageUrl) {
  const text = selection.replace(/\r\n/g, '\n').trim();
  const title = (pageTitle || pageUrl || 'Untitled').trim();
  const url = pageUrl.trim();
  const source = url ? `来源：[${title}](${url})` : `来源：${title}`;
  return `${text}\n\n${source}`;
}

function formatPageLinkNote(pageTitle, pageUrl) {
  const title = (pageTitle || pageUrl || 'Untitled').trim();
  const url = pageUrl.trim();
  return {
    title,
    content: url ? `[${title}](${url})` : title,
  };
}

function appendToNoteContent(existing, addition) {
  const a = existing.replace(/\s+$/, '');
  const b = addition.replace(/^\s+/, '');
  if (!a) return b;
  return `${a}\n\n---\n\n${b}`;
}

async function createNote(payload) {
  const res = await fetch(`${BASE}/api/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`create ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function updateNote(secret, payload) {
  const res = await fetch(`${BASE}/api/notes/${encodeURIComponent(secret)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`update ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function deleteNote(secret) {
  const res = await fetch(`${BASE}/api/notes/${encodeURIComponent(secret)}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`delete ${res.status}`);
  }
}

const results = [];

function ok(name, detail = '') {
  results.push({ name, pass: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, err) {
  results.push({ name, pass: false, detail: String(err) });
  console.error(`FAIL  ${name} — ${err}`);
}

async function main() {
  const secrets = [];

  try {
    const quote = formatSelectionQuote(
      'selected line\nsecond',
      'Example Page',
      'https://example.com/article',
    );
    if (
      !quote.includes('> selected line') ||
      !quote.includes('来源：[Example Page](https://example.com/article)')
    ) {
      throw new Error('quote format mismatch');
    }
    ok('clip quote format');

    const plain = formatSelectionPlain('hello', 'T', 'https://example.com');
    if (!plain.includes('hello') || !plain.includes('来源：')) {
      throw new Error('plain format mismatch');
    }
    ok('clip plain format');

    const page = formatPageLinkNote('Docs', 'https://example.com/docs');
    if (page.content !== '[Docs](https://example.com/docs)') {
      throw new Error('page link mismatch');
    }
    ok('page link format');

    const createdMd = await createNote({
      title: 'Extension verify MD',
      content: quote,
      format: 'markdown',
      timezone: 'Asia/Shanghai',
    });
    secrets.push(createdMd.secret);
    if (!createdMd.noteUrl || !createdMd.editUrl || !createdMd.rawUrl) {
      throw new Error('missing urls');
    }
    ok('create markdown clip', createdMd.noteUrl);

    const createdText = await createNote({
      title: 'Extension verify text',
      content: plain,
      format: 'text',
      timezone: 'Asia/Shanghai',
    });
    secrets.push(createdText.secret);
    ok('create plain/text note', createdText.id);

    const appended = appendToNoteContent(
      createdMd.content,
      formatSelectionQuote('more', 'B', 'https://b.example'),
    );
    const updated = await updateNote(createdMd.secret, { content: appended });
    if (!updated.content.includes('---') || !updated.content.includes('more')) {
      throw new Error('append body missing');
    }
    ok('append to existing note');

    console.log(
      '\nSummary:',
      results.filter((r) => r.pass).length,
      '/',
      results.length,
      'passed',
    );
    if (results.some((r) => !r.pass)) process.exitCode = 1;
  } catch (err) {
    fail('live flow', err);
    process.exitCode = 1;
  } finally {
    for (const secret of secrets) {
      try {
        await deleteNote(secret);
      } catch {
        // best-effort cleanup
      }
    }
  }
}

await main();
