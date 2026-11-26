import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Regression guard for the collapsed popup (docs/extension-rendering-root-cause.md). Chrome lays
 * an action popup out first in a 25 px window and sizes it to the width the content asks for, so
 * any viewport-relative width on the page root makes the popup a 25 px strip.
 */
const css = readFileSync(new URL('./popup.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

function rulesFor(selector: RegExp) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) => selectors!.split(',').some((part) => selector.test(part.trim())))
    .map(([, , body]) => body!);
}

describe('popup width strategy', () => {
  const rootRules = rulesFor(/^(html|body|#root|\.shell)$/);

  it('gives body one fixed pixel width', () => {
    const widths = rulesFor(/^body$/).flatMap((body) =>
      [...body.matchAll(/(?:^|;|\s)width:\s*([^;]+)/g)].map((match) => match[1]!.trim()),
    );
    expect(widths).toEqual([expect.stringMatching(/^\d+px$/)]);
    const px = Number.parseInt(widths[0]!, 10);
    // Chrome caps popups at 800 px; below ~360 px the result layout stops being usable.
    expect(px).toBeGreaterThanOrEqual(360);
    expect(px).toBeLessThanOrEqual(800);
  });

  it('never sizes the page root against the viewport', () => {
    for (const body of rootRules) {
      expect(body).not.toMatch(/(?:^|[;\s])(?:min-|max-)?width:\s*[^;]*(?:vw|%|auto|fit-content)/);
    }
  });

  it('has no width media query, which would match during the 25 px first pass', () => {
    expect(css).not.toMatch(/@media[^{]*\b(?:min-|max-)?width\b/);
  });
});
