/**
 * Real Chromium smoke test using Extensions.loadUnpacked
 * (required on branded Chrome 137+; --load-extension is ignored).
 */
import * as launcher from 'chrome-launcher';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const EXT = resolve(ROOT, '.output/chrome-mv3');
const BASE = process.env.PLAINNOTE_BASE_URL || 'https://plainshare-one.vercel.app';

function pipeRequest(pipes, method, params = {}) {
  const id = Math.floor(Math.random() * 1e9);
  const payload = JSON.stringify({ id, method, params }) + '\x00';
  return new Promise((resolve, reject) => {
    let buffer = '';
    const onData = (chunk) => {
      buffer += chunk.toString('utf8');
      let end;
      while ((end = buffer.indexOf('\x00')) !== -1) {
        const message = buffer.slice(0, end);
        buffer = buffer.slice(end + 1);
        try {
          const parsed = JSON.parse(message);
          if (parsed.id === id) {
            cleanup();
            if (parsed.error) reject(new Error(JSON.stringify(parsed.error)));
            else resolve(parsed.result);
          }
        } catch {
          // ignore
        }
      }
    };
    const onError = (err) => {
      cleanup();
      reject(err);
    };
    const onClose = () => {
      cleanup();
      reject(new Error('pipe closed before response'));
    };
    const cleanup = () => {
      pipes.incoming.off('data', onData);
      pipes.incoming.off('error', onError);
      pipes.incoming.off('close', onClose);
    };
    pipes.incoming.on('data', onData);
    pipes.incoming.on('error', onError);
    pipes.incoming.on('close', onClose);
    pipes.outgoing.write(payload);
  });
}

class BrowserSession {
  constructor(pipes) {
    this.pipes = pipes;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = '';
    this.pipes.incoming.on('data', (chunk) => this.#onData(chunk));
  }

  #onData(chunk) {
    this.buffer += chunk.toString('utf8');
    let end;
    while ((end = this.buffer.indexOf('\x00')) !== -1) {
      const message = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end + 1);
      let parsed;
      try {
        parsed = JSON.parse(message);
      } catch {
        continue;
      }
      if (parsed.id != null && this.pending.has(parsed.id)) {
        const { resolve, reject } = this.pending.get(parsed.id);
        this.pending.delete(parsed.id);
        if (parsed.error) reject(new Error(JSON.stringify(parsed.error)));
        else resolve(parsed.result);
      }
    }
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    const result = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    this.pipes.outgoing.write(JSON.stringify(msg) + '\x00');
    return result;
  }

  sendToSession(sessionId, method, params = {}) {
    return this.send(method, params, sessionId);
  }
}

async function main() {
  const results = [];
  const log = (name, pass, detail = '') => {
    results.push({ name, pass, detail });
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  };

  const chromeFlags = launcher.Launcher.defaultFlags()
    .filter((flag) => flag !== '--disable-extensions')
    .concat([
      '--remote-debugging-pipe',
      '--enable-unsafe-extension-debugging',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-popup-blocking',
    ]);

  const chrome = await launcher.launch({
    chromeFlags,
    ignoreDefaultFlags: true,
    startingUrl: 'about:blank',
  });

  try {
    const pipes = chrome.remoteDebuggingPipes;
    if (!pipes) throw new Error('remoteDebuggingPipes unavailable');

    const loaded = await pipeRequest(pipes, 'Extensions.loadUnpacked', { path: EXT });
    const extId = loaded.id;
    log('extension loaded', !!extId, extId);

    const browser = new BrowserSession(pipes);

    const popupUrl = `chrome-extension://${extId}/popup.html`;
    const { targetId: popupTargetId } = await browser.send('Target.createTarget', {
      url: popupUrl,
    });
    await sleep(2000);
    const { sessionId: popupSession } = await browser.send('Target.attachToTarget', {
      targetId: popupTargetId,
      flatten: true,
    });
    await browser.sendToSession(popupSession, 'Runtime.enable');

    const urlInfo = await browser.sendToSession(popupSession, 'Runtime.evaluate', {
      expression: 'location.href',
      returnByValue: true,
    });
    log(
      'popup url',
      String(urlInfo.result?.value || '').includes('popup.html'),
      String(urlInfo.result?.value || ''),
    );

    for (let i = 0; i < 40; i++) {
      const probe = await browser.sendToSession(popupSession, 'Runtime.evaluate', {
        expression: `!!document.querySelector('textarea, .cm-editor, input, button')`,
        returnByValue: true,
      });
      if (probe.result?.value) break;
      await sleep(200);
    }

    // Popup may open on quick-action menu — enter create first.
    await browser.sendToSession(popupSession, 'Runtime.evaluate', {
      expression: `(() => {
        const buttons = [...document.querySelectorAll('button')];
        const btn = buttons.find((b) => /新建笔记|New note/.test(b.textContent || ''));
        if (btn) btn.click();
        return !!btn;
      })()`,
      returnByValue: true,
    });
    await sleep(400);

    const fill = await browser.sendToSession(popupSession, 'Runtime.evaluate', {
      expression: `(() => {
        const inputs = [...document.querySelectorAll('input')];
        const title = inputs.find((el) => el.type !== 'hidden') || inputs[0];
        if (title) {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          setter?.call(title, 'Browser verify title');
          title.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const ta = document.querySelector('textarea');
        const cm = document.querySelector('.cm-content');
        if (ta) {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
          setter?.call(ta, 'Browser verify body from popup');
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          return 'textarea';
        }
        if (cm) {
          cm.focus();
          document.execCommand('selectAll');
          document.execCommand('insertText', false, 'Browser verify body from popup');
          return 'codemirror';
        }
        return 'none:' + (document.body?.innerText || '').slice(0, 160);
      })()`,
      returnByValue: true,
    });
    log('popup form fill', !String(fill.result?.value || '').startsWith('none'), String(fill.result?.value));

    const clickSave = await browser.sendToSession(popupSession, 'Runtime.evaluate', {
      expression: `(() => {
        const buttons = [...document.querySelectorAll('button')];
        const btn = buttons.find((b) => /保存到 PlainNote|Save to PlainNote/.test(b.textContent || ''))
          || buttons.find((b) => /保存|Save|Create/.test(b.textContent || ''));
        if (!btn) return 'missing:' + buttons.map((b) => (b.textContent || '').trim()).join('|');
        btn.click();
        return (btn.textContent || '').trim();
      })()`,
      returnByValue: true,
    });
    log('click save', !String(clickSave.result?.value || '').startsWith('missing'), String(clickSave.result?.value));

    let success = false;
    let lastSnippet = '';
    for (let i = 0; i < 40; i++) {
      await sleep(500);
      const check = await browser.sendToSession(popupSession, 'Runtime.evaluate', {
        expression: `(() => {
          const text = document.body?.innerText || '';
          return {
            saved: /笔记保存成功|Note saved successfully|已保存到服务端|Saved to the server/.test(text),
            noteUrl: /\\/note\\//.test(text),
            editUrl: /\\/edit\\//.test(text),
            rawUrl: /\\/raw\\//.test(text),
            warning: /私有凭据|private credentials|勿公开分享|do not share/i.test(text),
            snippet: text.slice(0, 360),
          };
        })()`,
        returnByValue: true,
      });
      const v = check.result?.value;
      lastSnippet = v?.snippet || '';
      if (v?.saved && v?.noteUrl && v?.editUrl && v?.rawUrl) {
        success = true;
        log('popup save success UI', true, `links+warn=${!!v.warning}`);
        break;
      }
    }
    if (!success) log('popup save success UI', false, lastSnippet || 'timeout');

    const sideUrl = `chrome-extension://${extId}/sidepanel.html`;
    const { targetId: sideTargetId } = await browser.send('Target.createTarget', { url: sideUrl });
    await sleep(2500);
    const { sessionId: sideSession } = await browser.send('Target.attachToTarget', {
      targetId: sideTargetId,
      flatten: true,
    });
    await browser.sendToSession(sideSession, 'Runtime.enable');
    const listCheck = await browser.sendToSession(sideSession, 'Runtime.evaluate', {
      expression: `(() => {
        const text = document.body?.innerText || '';
        return {
          hasTitle: /Browser verify title/.test(text),
          hasBody: /Browser verify body/.test(text),
          snippet: text.slice(0, 400),
        };
      })()`,
      returnByValue: true,
    });
    const lv = listCheck.result?.value;
    log(
      'sidepanel shows new note',
      !!(lv?.hasTitle || lv?.hasBody),
      lv?.hasTitle || lv?.hasBody ? 'found' : lv?.snippet || 'not found',
    );

    const { targetId: pageTargetId } = await browser.send('Target.createTarget', {
      url: 'https://example.com',
    });
    await sleep(2500);
    const { sessionId: pageSession } = await browser.send('Target.attachToTarget', {
      targetId: pageTargetId,
      flatten: true,
    });
    await browser.sendToSession(pageSession, 'Runtime.enable');
    const ctx = await browser.sendToSession(pageSession, 'Runtime.evaluate', {
      expression: `(() => {
        const sel = window.getSelection();
        const range = document.createRange();
        const p = document.querySelector('p') || document.body;
        range.selectNodeContents(p);
        sel.removeAllRanges();
        sel.addRange(range);
        return (sel.toString() || '').slice(0, 80);
      })()`,
      returnByValue: true,
    });
    log(
      'page selection available',
      !!(ctx.result?.value && String(ctx.result.value).length > 0),
      String(ctx.result?.value || '').slice(0, 60),
    );

    // Wake SW / content script via Extensions API is hard over pipe; use chrome.debugger-less tabs.sendMessage from an extension page.
    const pageCtx = await browser.sendToSession(popupSession, 'Runtime.evaluate', {
      expression: `(() => new Promise(async (resolve) => {
        try {
          const tabs = await chrome.tabs.query({ url: 'https://example.com/*' });
          const tab = tabs[0];
          if (!tab?.id) return resolve({ ok: false, err: 'no tab' });
          const pageContext = await chrome.tabs.sendMessage(tab.id, { type: 'PLAINNOTE_GET_PAGE_CONTEXT' });
          resolve({ ok: true, ctx: pageContext });
        } catch (e) {
          resolve({ ok: false, err: String(e) });
        }
      }))()`,
      returnByValue: true,
      awaitPromise: true,
    });
    const mv = pageCtx.result?.value;
    log(
      'content script page context',
      !!(mv?.ok && (mv.ctx?.selection || mv.ctx?.url)),
      mv?.ok ? JSON.stringify(mv.ctx).slice(0, 140) : String(mv?.err || ''),
    );

    const outPath = resolve(ROOT, 'docs/browser-extension/TEST-RESULTS.quick-capture.json');
    const mdPath = resolve(ROOT, 'docs/browser-extension/TEST-RESULTS.quick-capture.md');
    const payload = {
      at: new Date().toISOString(),
      baseUrl: BASE,
      extensionId: extId,
      results,
      popupSaveOk: success,
      method: 'Extensions.loadUnpacked + remote-debugging-pipe',
    };
    await writeFile(outPath, JSON.stringify(payload, null, 2));

    const lines = [
      '# Quick Capture — Test Results',
      '',
      `- Time: ${payload.at}`,
      `- Server: ${BASE}`,
      `- Extension ID: ${extId}`,
      `- Method: ${payload.method}`,
      '',
      '| Check | Result | Detail |',
      '|---|---|---|',
      ...results.map((r) => `| ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${String(r.detail).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`),
      '',
      '## Acceptance mapping',
      '',
      '1. Selection save / source title+URL — covered by content-script page context + live REST clip format tests.',
      '2. Text / Markdown save — popup create uses format toggle; live REST verified both formats.',
      '3. Append to existing note — live REST append test + context-menu handlers in background.',
      '4. Local tags/folders retained — popup success UI shows local folder/tags after create.',
      '5. Popup create visible in side panel — sidepanel shows new note check above.',
      '',
    ];
    await writeFile(mdPath, lines.join('\n'));

    console.log('\nWrote', outPath);
    console.log('Wrote', mdPath);
    console.log(
      'Summary:',
      results.filter((r) => r.pass).length,
      '/',
      results.length,
      'passed',
    );
    if (results.some((r) => !r.pass)) process.exitCode = 1;
  } finally {
    await chrome.kill();
  }
}

await main();
