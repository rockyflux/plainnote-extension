/** Minimal Markdown → safe HTML for workbench preview (no external deps). */
export function renderMarkdownPreview(source: string): string {
  const escaped = escapeHtml(source.replace(/\r\n/g, '\n'));
  const lines = escaped.split('\n');
  const out: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let inList = false;

  const flushCode = () => {
    if (!inCode) return;
    out.push(`<pre class="pn-md-pre"><code>${codeBuf.join('\n')}</code></pre>`);
    codeBuf = [];
    inCode = false;
  };

  const flushList = () => {
    if (!inList) return;
    out.push('</ul>');
    inList = false;
  };

  for (const line of lines) {
    if (line.startsWith('```')) {
      flushList();
      if (inCode) flushCode();
      else {
        inCode = true;
        codeBuf = [];
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    const task = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (task) {
      if (!inList) {
        out.push('<ul class="pn-md-ul">');
        inList = true;
      }
      const checked = (task[1] ?? ' ') !== ' ';
      const label = task[2] ?? '';
      out.push(
        `<li class="pn-md-li pn-md-task${checked ? ' is-checked' : ''}">` +
          `<span class="pn-md-check" aria-hidden="true"></span>` +
          `<span>${inline(label)}</span></li>`,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        out.push('<ul class="pn-md-ul">');
        inList = true;
      }
      out.push(`<li class="pn-md-li">${inline(line.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }

    flushList();

    if (/^###\s+/.test(line)) {
      out.push(`<h3 class="pn-md-h3">${inline(line.replace(/^###\s+/, ''))}</h3>`);
    } else if (/^##\s+/.test(line)) {
      out.push(`<h2 class="pn-md-h2">${inline(line.replace(/^##\s+/, ''))}</h2>`);
    } else if (/^#\s+/.test(line)) {
      out.push(`<h1 class="pn-md-h1">${inline(line.replace(/^#\s+/, ''))}</h1>`);
    } else if (/^&gt;\s?/.test(line) || /^>\s?/.test(line)) {
      const body = line.replace(/^(&gt;|>)\s?/, '');
      out.push(`<blockquote class="pn-md-quote">${inline(body)}</blockquote>`);
    } else if (line.trim() === '') {
      out.push('<div class="pn-md-gap"></div>');
    } else {
      out.push(`<p class="pn-md-p">${inline(line)}</p>`);
    }
  }
  flushCode();
  flushList();
  return out.join('\n');
}

function inline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="pn-md-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a class="pn-md-a" href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
