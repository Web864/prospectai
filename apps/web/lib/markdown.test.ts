import { describe, expect, it } from 'vitest';
import { markdownToPlainText, readingMinutes, renderMarkdown, safeHref } from './markdown';

describe('renderMarkdown', () => {
  it('renders headings from h2, paragraphs, lists and inline formatting', () => {
    const { html, headings } = renderMarkdown(
      '# Why Claude\n\nIt is **careful** and *fast*.\n\n- one\n- two\n\n1. first\n2. second',
    );
    expect(html).toContain('<h2 id="why-claude">Why Claude</h2>');
    expect(html).toContain('<p>It is <strong>careful</strong> and <em>fast</em>.</p>');
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>');
    expect(html).toContain('<ol><li>first</li><li>second</li></ol>');
    expect(headings).toEqual([{ level: 2, text: 'Why Claude', id: 'why-claude' }]);
  });

  it('escapes raw HTML and script so admin content cannot inject markup', () => {
    const { html } = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('drops unsafe link protocols and hardens external links', () => {
    const { html } = renderMarkdown(
      '[bad](javascript:alert(1)) [ok](https://www.anthropic.com/claude) [home](/pricing)',
    );
    expect(html).not.toContain('javascript:');
    expect(html).toContain('bad');
    expect(html).toContain(
      '<a href="https://www.anthropic.com/claude" target="_blank" rel="noopener noreferrer nofollow">ok</a>',
    );
    expect(html).toContain('<a href="/pricing">home</a>');
  });

  it('keeps code blocks verbatim and escaped', () => {
    const { html } = renderMarkdown('```\nconst a = "<b>";\n```');
    expect(html).toBe('<pre><code>const a = &quot;&lt;b&gt;&quot;;</code></pre>');
  });

  it('gives duplicate headings unique ids', () => {
    const { headings } = renderMarkdown('## Setup\n\n## Setup');
    expect(new Set(headings.map((heading) => heading.id)).size).toBe(2);
  });
});

describe('helpers', () => {
  it('accepts only safe hrefs', () => {
    expect(safeHref('//evil.example')).toBeNull();
    expect(safeHref('data:text/html,x')).toBeNull();
    expect(safeHref('mailto:a@b.co')).toBe('mailto:a@b.co');
  });

  it('produces plain text and a reading time', () => {
    expect(markdownToPlainText('## Hi\n\n**Bold** [link](/x)')).toBe('Hi Bold link');
    expect(readingMinutes('word '.repeat(660))).toBe(3);
  });
});
