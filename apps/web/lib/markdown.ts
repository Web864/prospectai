/**
 * A small, dependency-free Markdown renderer for admin-written site content.
 *
 * Safety comes first: every character of input is HTML-escaped before any formatting is applied,
 * raw HTML in the source is shown as text, and links are limited to http(s), mailto and
 * site-relative URLs. External links get rel="noopener noreferrer nofollow" and open in a new tab.
 *
 * Supported: # to #### headings, paragraphs, blank-line separation, - / * / 1. lists, > quotes,
 * ``` fenced code, `inline code`, **bold**, *italic*, [text](url) and --- rules.
 */

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (/^(https?:\/\/|mailto:)/i.test(href)) return href;
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  if (href.startsWith('#')) return href;
  return null;
}

export function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

/** Inline formatting on text that has already been HTML-escaped. */
function inline(escaped: string): string {
  const codeSpans: string[] = [];
  let text = escaped.replace(/`([^`]+)`/g, (_, code: string) => {
    codeSpans.push(`<code>${code}</code>`);
    return `\u0000${codeSpans.length - 1}\u0000`;
  });
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, url: string) => {
    // The URL was escaped with the rest of the line; undo only the ampersand for query strings.
    const href = safeHref(url.replace(/&amp;/g, '&'));
    if (!href) return label;
    const external = /^https?:\/\//i.test(href);
    return `<a href="${escapeHtml(href)}"${
      external ? ' target="_blank" rel="noopener noreferrer nofollow"' : ''
    }>${label}</a>`;
  });
  text = text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/(^|\W)_([^_\s][^_]*)_(?=\W|$)/g, '$1<em>$2</em>');
  return text.replace(/\u0000(\d+)\u0000/g, (_, index: string) => codeSpans[Number(index)] ?? '');
}

export interface RenderedMarkdown {
  html: string;
  headings: { level: number; text: string; id: string }[];
}

export function renderMarkdown(source: string): RenderedMarkdown {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  const headings: RenderedMarkdown['headings'] = [];
  const usedIds = new Set<string>();
  let paragraph: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let quote: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${inline(escapeHtml(paragraph.join(' ')))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list)
      out.push(
        `<${list.type}>${list.items.map((item) => `<li>${inline(escapeHtml(item))}</li>`).join('')}</${list.type}>`,
      );
    list = null;
  };
  const flushQuote = () => {
    if (quote.length)
      out.push(`<blockquote><p>${inline(escapeHtml(quote.join(' ')))}</p></blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (/^```/.test(line.trim())) {
      flushAll();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test((lines[index] ?? '').trim())) {
        code.push(lines[index] ?? '');
        index += 1;
      }
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    if (!line.trim()) {
      flushAll();
      continue;
    }
    const heading = /^(#{1,4})\s+(.+?)\s*#*$/.exec(line);
    if (heading) {
      flushAll();
      // A post's title is its only h1, so Markdown headings start at h2.
      const level = Math.min(heading[1]!.length + 1, 5);
      const text = heading[2]!;
      let id = slugifyHeading(text) || `section-${headings.length + 1}`;
      while (usedIds.has(id)) id = `${id}-${headings.length + 1}`;
      usedIds.add(id);
      headings.push({ level, text, id });
      out.push(`<h${level} id="${id}">${inline(escapeHtml(text))}</h${level}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushAll();
      out.push('<hr />');
      continue;
    }
    const quoteLine = /^>\s?(.*)$/.exec(line);
    if (quoteLine) {
      flushParagraph();
      flushList();
      quote.push(quoteLine[1] ?? '');
      continue;
    }
    const unordered = /^\s*[-*]\s+(.+)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      flushParagraph();
      flushQuote();
      const type = unordered ? 'ul' : 'ol';
      if (list && list.type !== type) flushList();
      list ??= { type, items: [] };
      list.items.push((unordered ?? ordered)![1]!);
      continue;
    }
    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }
  flushAll();
  return { html: out.join('\n'), headings };
}

/** Plain text for excerpts, search snippets and the chatbot's knowledge base. */
export function markdownToPlainText(source: string) {
  return source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*([-*]|\d+[.)])\s+/gm, '')
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function readingMinutes(source: string) {
  return Math.max(1, Math.round(markdownToPlainText(source).split(' ').length / 220));
}
