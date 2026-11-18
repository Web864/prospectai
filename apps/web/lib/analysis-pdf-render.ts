import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFPage } from 'pdf-lib';
import { AppError } from '@prospectai/shared';
import type { AnalysisPdfReport } from './analysis-pdf';

type Color = ReturnType<typeof rgb>;

const PAGE: [number, number] = [595.28, 841.89];
const LEFT = 50;
const WIDTH = 495;
const TOP = 735;
const BOTTOM = 62;
const MAX_PAGES = 200;
const MAX_TEXT = 500_000;
const MAX_PAGE_ROWS = 40;

const teal = rgb(0, 0.46, 0.4);
const ink = rgb(0.07, 0.12, 0.2);
const muted = rgb(0.38, 0.44, 0.5);
const rule = rgb(0.85, 0.89, 0.9);
const panel = rgb(0.95, 0.97, 0.97);
const white = rgb(1, 1, 1);
const amber = rgb(0.72, 0.47, 0);

const severityRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
const severityColors: Record<string, Color> = {
  CRITICAL: rgb(0.75, 0.1, 0.1),
  HIGH: rgb(0.85, 0.38, 0.05),
  MEDIUM: rgb(0.72, 0.52, 0),
  LOW: rgb(0.2, 0.45, 0.75),
  INFO: rgb(0.45, 0.5, 0.55),
};
const severityOf = (value?: string) => (value ?? 'INFO').toUpperCase();
const severityColor = (value?: string) => severityColors[severityOf(value)] ?? severityColors.INFO!;

function scoreColor(score: number): Color {
  if (score >= 80) return rgb(0.1, 0.55, 0.3);
  if (score >= 60) return rgb(0.2, 0.5, 0.7);
  if (score >= 40) return amber;
  return rgb(0.75, 0.1, 0.1);
}
function scoreBand(score: number) {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Weak';
  return 'Poor';
}
const percent = (value: number) => `${Math.round(value * 100)}%`;
const label = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (first) => first.toUpperCase());
function formatDate(value: Date | null) {
  if (!value) return 'Not recorded';
  const iso = value.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

const securityHeaderPurpose: Array<[string, string]> = [
  ['strict-transport-security', 'Forces browsers to use HTTPS'],
  ['content-security-policy', 'Limits where scripts and other resources may load from'],
  ['x-frame-options', 'Prevents the page being embedded in other sites (clickjacking)'],
  ['x-content-type-options', 'Stops browsers guessing file types (MIME sniffing)'],
  ['referrer-policy', 'Controls how much address data is sent to other sites'],
  ['permissions-policy', 'Restricts access to browser features such as camera and location'],
];

function pageNotes(page: NonNullable<AnalysisPdfReport['pages']>[number]) {
  const notes: string[] = [];
  if (page.h1Count === 0) notes.push('No H1 heading');
  else if (page.h1Count !== null && page.h1Count > 1) notes.push(`${page.h1Count} H1 headings`);
  if (page.missingAlt) notes.push(`${page.missingAlt} images without alt text`);
  if (page.unlabeledInputs) notes.push(`${page.unlabeledInputs} unlabeled form fields`);
  if (page.unnamedButtons) notes.push(`${page.unnamedButtons} unnamed buttons`);
  if (page.emptyLinks) notes.push(`${page.emptyLinks} empty links`);
  if (page.headingSkips) notes.push(`${page.headingSkips} skipped heading levels`);
  if (page.hasMain === false) notes.push('No main landmark');
  if (page.placeholderText) notes.push('Placeholder text found');
  if (page.robots && /noindex/i.test(page.robots)) notes.push('Marked noindex');
  if (page.status !== null && page.status >= 400) notes.push(`HTTP error ${page.status}`);
  return notes.length ? notes.join('; ') : 'No problems in the checks run';
}

export async function renderAnalysisPdf(
  report: AnalysisPdfReport,
  generatedAt: Date,
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const font = await document.embedFont(
    new Uint8Array(
      await readFile(join(process.cwd(), 'public/assets/prospectai/fonts/NotoSans-Regular.ttf')),
    ),
    { subset: true },
  );
  const logo = await document.embedPng(
    new Uint8Array(await readFile(join(process.cwd(), 'public/brand-mark.png'))),
  );
  document.setTitle(`ProspectAI - ${report.domain}`);
  document.setAuthor('ProspectAI');
  document.setSubject('Website intelligence report');
  document.setCreationDate(generatedAt);

  // Noto Sans covers Latin, Greek and Cyrillic only. Anything else would be drawn as an empty box
  // without warning, so unsupported characters become "?" and the report says so.
  const supported = new Set(font.getCharacterSet());
  let replacedCharacters = 0;
  const clean = (value: string) => {
    let output = '';
    for (const character of value.normalize('NFC')) {
      const code = character.codePointAt(0) ?? 0;
      if (code === 10) output += character;
      else if (code === 9) output += ' ';
      else if (code < 32 || code === 127 || (code >= 0x80 && code <= 0x9f)) continue;
      else if ([0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0xfeff].includes(code)) continue;
      else if (supported.has(code)) output += character;
      else if (/\s/.test(character)) output += ' ';
      else {
        output += '?';
        replacedCharacters += 1;
      }
    }
    return output;
  };

  let page: PDFPage = document.addPage(PAGE);
  let y = TOP;
  let textLength = 0;
  const widths = new Map<string, number>();
  const width = (value: string, size: number) => {
    const key = `${size}:${value}`;
    const cached = widths.get(key);
    if (cached !== undefined) return cached;
    const measured = font.widthOfTextAtSize(value, size);
    if (widths.size < 20_000) widths.set(key, measured);
    return measured;
  };
  const newPage = () => {
    if (document.getPageCount() >= MAX_PAGES)
      throw new AppError('VALIDATION_ERROR', 'This report exceeds the PDF page limit.', 422);
    page = document.addPage(PAGE);
    y = TOP;
  };
  const ensure = (height: number) => {
    if (y - height < BOTTOM) newPage();
  };
  const wrap = (value: string, size: number, maxWidth: number) => {
    textLength += value.length;
    if (textLength > MAX_TEXT)
      throw new AppError('VALIDATION_ERROR', 'This report exceeds the PDF text limit.', 422);
    const lines: string[] = [];
    for (const paragraph of clean(value).split('\n')) {
      let line = '';
      for (const word of paragraph.split(/ +/)) {
        if (!word) continue;
        const candidate = line ? `${line} ${word}` : word;
        if (width(candidate, size) <= maxWidth) {
          line = candidate;
          continue;
        }
        if (line) {
          lines.push(line);
          line = '';
        }
        if (width(word, size) <= maxWidth) {
          line = word;
          continue;
        }
        // Long unbroken strings such as URLs are split by glyph width.
        for (const character of word) {
          if (line && width(line + character, size) > maxWidth) {
            lines.push(line);
            line = '';
          }
          line += character;
        }
      }
      lines.push(line);
    }
    return lines;
  };
  const text = (
    value: string,
    options: {
      size?: number;
      color?: Color;
      x?: number;
      width?: number;
      after?: number;
      lineHeight?: number;
    } = {},
  ) => {
    const size = options.size ?? 10;
    const x = options.x ?? LEFT;
    const maxWidth = options.width ?? LEFT + WIDTH - x;
    const step = size * (options.lineHeight ?? 1.45);
    for (const line of wrap(value, size, maxWidth)) {
      ensure(step);
      if (line) page.drawText(line, { x, y: y - size, size, font, color: options.color ?? ink });
      y -= step;
    }
    y -= options.after ?? 4;
  };
  const heading = (title: string) => {
    ensure(70);
    y -= 12;
    text(title, { size: 14, color: teal, after: 3 });
    page.drawLine({
      start: { x: LEFT, y },
      end: { x: LEFT + WIDTH, y },
      thickness: 0.8,
      color: rule,
    });
    y -= 9;
  };
  const labelled = (name: string, value: string, color: Color = ink) => {
    text(name.toUpperCase(), { size: 7.5, color: muted, after: 0, lineHeight: 1.3 });
    text(value, { size: 9.5, color, after: 5 });
  };
  const chip = (value: string, color: Color, x: number, top: number) => {
    const caption = value.toUpperCase();
    const chipWidth = width(caption, 7.5) + 10;
    page.drawRectangle({ x, y: top - 12, width: chipWidth, height: 12, color });
    page.drawText(caption, { x: x + 5, y: top - 9.5, size: 7.5, font, color: white });
    return chipWidth;
  };
  const table = (columns: Array<{ title: string; width: number }>, rows: string[][]) => {
    const pad = 5;
    const size = 8.5;
    const step = size * 1.4;
    const header = () => {
      ensure(22);
      page.drawRectangle({ x: LEFT, y: y - 18, width: WIDTH, height: 18, color: panel });
      let x = LEFT;
      for (const column of columns) {
        page.drawText(clean(column.title), { x: x + pad, y: y - 12.5, size, font, color: teal });
        x += column.width;
      }
      y -= 18;
    };
    // Keep the header with at least its first row instead of stranding it at a page bottom.
    ensure(60);
    header();
    for (const row of rows) {
      const cells = row.map((cell, index) =>
        wrap(cell, size, (columns[index]?.width ?? 100) - pad * 2),
      );
      const height = Math.max(1, ...cells.map((lines) => lines.length)) * step + 8;
      if (y - height < BOTTOM) {
        newPage();
        header();
      }
      let x = LEFT;
      cells.forEach((lines, index) => {
        lines.forEach((line, offset) => {
          if (line)
            page.drawText(line, {
              x: x + pad,
              y: y - 4 - size - offset * step,
              size,
              font,
              color: ink,
            });
        });
        x += columns[index]?.width ?? 100;
      });
      y -= height;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: LEFT + WIDTH, y },
        thickness: 0.4,
        color: rule,
      });
    }
    y -= 8;
  };

  // ---- Title block -------------------------------------------------------------------------
  text('Website Intelligence Report', { size: 22, after: 2 });
  text(report.domain, { size: 16, color: teal, after: 2 });
  text(report.url, { size: 9, color: muted, after: 2 });
  text(
    `Analyzed ${formatDate(report.analyzedAt)}  |  Status: ${label(report.status)}` +
      (report.scoringVersion ? `  |  Scoring ${report.scoringVersion}` : ''),
    { size: 9, color: muted, after: 8 },
  );
  if (report.status === 'PARTIAL') {
    const banner = wrap(
      'Partial report: some analysis steps did not finish, so scores and findings may be incomplete. See Limitations at the end of this report.',
      9,
      WIDTH - 20,
    );
    const boxHeight = banner.length * 13 + 12;
    ensure(boxHeight + 8);
    page.drawRectangle({
      x: LEFT,
      y: y - boxHeight,
      width: WIDTH,
      height: boxHeight,
      color: rgb(1, 0.96, 0.86),
      borderColor: amber,
      borderWidth: 0.8,
    });
    banner.forEach((line, index) =>
      page.drawText(line, { x: LEFT + 10, y: y - 15 - index * 13, size: 9, font, color: ink }),
    );
    y -= boxHeight + 10;
  }

  // ---- Score cards -------------------------------------------------------------------------
  const card = (
    index: number,
    title: string,
    value: number | null,
    suffix: string,
    color: Color,
    caption: string | null,
    fill: number | null,
  ) => {
    const x = LEFT + index * 170;
    page.drawRectangle({
      x,
      y: y - 78,
      width: 155,
      height: 78,
      color: panel,
      borderColor: rule,
      borderWidth: 0.8,
    });
    page.drawText(title, { x: x + 10, y: y - 17, size: 8.5, font, color: muted });
    if (caption)
      page.drawText(caption, {
        x: x + 145 - width(caption, 8.5),
        y: y - 17,
        size: 8.5,
        font,
        color,
      });
    const shown = value === null ? 'N/A' : String(value);
    page.drawText(shown, {
      x: x + 10,
      y: y - 50,
      size: 28,
      font,
      color: value === null ? muted : color,
    });
    if (value !== null)
      page.drawText(suffix, {
        x: x + 14 + width(shown, 28),
        y: y - 50,
        size: 10,
        font,
        color: muted,
      });
    if (fill !== null) {
      page.drawRectangle({ x: x + 10, y: y - 68, width: 135, height: 5, color: rule });
      page.drawRectangle({
        x: x + 10,
        y: y - 68,
        width: Math.max(1, 135 * Math.min(1, fill)),
        height: 5,
        color,
      });
    }
  };
  ensure(100);
  const site = report.websiteScore;
  card(
    0,
    'Website Score',
    site,
    '/ 100',
    site === null ? muted : scoreColor(site),
    site === null ? null : scoreBand(site),
    site === null ? null : site / 100,
  );
  const opportunity = report.opportunityScore;
  card(
    1,
    'Opportunity Score',
    opportunity,
    '/ 100',
    teal,
    null,
    opportunity === null ? null : opportunity / 100,
  );
  const confidence = report.confidence;
  card(
    2,
    'Confidence',
    confidence === null ? null : Math.round(confidence * 100),
    '%',
    rgb(0.25, 0.35, 0.5),
    null,
    confidence,
  );
  y -= 94;

  // ---- Executive summary -------------------------------------------------------------------
  heading('Executive summary');
  text(report.summary ?? 'No business summary was recorded.', { after: 6 });
  const bySeverity = new Map<string, number>();
  for (const finding of report.findings)
    bySeverity.set(
      severityOf(finding.severity),
      (bySeverity.get(severityOf(finding.severity)) ?? 0) + 1,
    );
  const severityLine = Object.keys(severityRank)
    .sort((a, b) => (severityRank[b] ?? 0) - (severityRank[a] ?? 0))
    .filter((name) => bySeverity.has(name))
    .map((name) => `${bySeverity.get(name)} ${name.toLowerCase()}`)
    .join(', ');
  text(
    report.findings.length
      ? `${report.findings.length} findings were recorded (${severityLine}).`
      : 'No findings were recorded. This does not establish that the website is free of issues.',
    { size: 9.5, after: 4 },
  );
  if (report.coverage)
    text(
      `${report.coverage.analyzed} of ${report.coverage.discovered} discovered pages were analyzed` +
        (report.coverage.skipped ? `; ${report.coverage.skipped} were skipped.` : '.'),
      { size: 9.5, after: 6 },
    );
  const topFindings = [...report.findings]
    .sort(
      (a, b) =>
        (severityRank[severityOf(b.severity)] ?? 0) - (severityRank[severityOf(a.severity)] ?? 0),
    )
    .slice(0, 5);
  if (topFindings.length) {
    text('Most important findings', { size: 11, color: teal, after: 3 });
    for (const finding of topFindings) {
      ensure(20);
      const chipWidth = chip(
        severityOf(finding.severity),
        severityColor(finding.severity),
        LEFT,
        y,
      );
      text(`${finding.title} (${finding.category})`, {
        size: 9.5,
        x: LEFT + chipWidth + 8,
        after: 3,
        lineHeight: 1.3,
      });
    }
  }
  const topOpportunity = [...report.opportunities].sort(
    (a, b) => b.opportunityScore - a.opportunityScore,
  )[0];
  if (topOpportunity) {
    y -= 4;
    text('Strongest service opportunity', { size: 11, color: teal, after: 3 });
    text(
      `${topOpportunity.title} - ${topOpportunity.serviceCategory}, Opportunity Score ${topOpportunity.opportunityScore} / 100`,
      { size: 9.5 },
    );
  }

  // ---- Score breakdown ---------------------------------------------------------------------
  if (report.componentScores?.length) {
    heading('How the Website Score was built');
    text(
      'The Website Score combines nine weighted components. Each starts at 100 and loses points for the findings in that area.',
      { size: 9.5, color: muted, after: 6 },
    );
    ensure(24);
    for (const [caption, x] of [
      ['COMPONENT', 50],
      ['WEIGHT', 170],
      ['SCORE', 220],
      ['FINDINGS', 470],
    ] as const)
      page.drawText(caption, { x, y: y - 8, size: 7.5, font, color: muted });
    y -= 16;
    for (const component of report.componentScores) {
      ensure(22);
      const color = scoreColor(component.score);
      page.drawText(clean(component.name), { x: 50, y: y - 11, size: 9.5, font, color: ink });
      page.drawText(`${Math.round(component.weight * 100)}%`, {
        x: 170,
        y: y - 11,
        size: 9.5,
        font,
        color: muted,
      });
      page.drawText(String(component.score), { x: 220, y: y - 11, size: 9.5, font, color });
      page.drawRectangle({ x: 255, y: y - 11, width: 200, height: 6, color: rule });
      page.drawRectangle({
        x: 255,
        y: y - 11,
        width: Math.max(1, (200 * Math.min(100, component.score)) / 100),
        height: 6,
        color,
      });
      page.drawText(String(component.findingCount), {
        x: 470,
        y: y - 11,
        size: 9.5,
        font,
        color: ink,
      });
      y -= 20;
    }
    y -= 4;
  }

  // ---- Pages analyzed ----------------------------------------------------------------------
  const pages = report.pages ?? [];
  if (pages.length) {
    heading('Pages analyzed');
    table(
      [
        { title: 'Page', width: 215 },
        { title: 'HTTP', width: 38 },
        { title: 'Time', width: 50 },
        { title: 'Checks', width: 192 },
      ],
      pages
        .slice(0, MAX_PAGE_ROWS)
        .map((entry) => [
          entry.title ? `${entry.url}\n${entry.title}` : entry.url,
          entry.status === null ? '-' : String(entry.status),
          entry.responseTimeMs === null ? '-' : `${Math.round(entry.responseTimeMs)} ms`,
          pageNotes(entry),
        ]),
    );
    if (pages.length > MAX_PAGE_ROWS)
      text(`${pages.length - MAX_PAGE_ROWS} further analyzed pages are not listed here.`, {
        size: 9,
        color: muted,
      });
  }

  // ---- Findings ----------------------------------------------------------------------------
  heading('Findings and evidence');
  if (!report.findings.length)
    text('No findings were recorded. This does not establish that the website is free of issues.');
  const categoryOrder = [
    ...(report.componentScores?.map((component) => component.name.toLowerCase()) ?? []),
  ];
  const groups = new Map<string, AnalysisPdfReport['findings']>();
  for (const finding of report.findings)
    groups.set(finding.category, [...(groups.get(finding.category) ?? []), finding]);
  const orderedCategories = [...groups.keys()].sort((a, b) => {
    const rank = (name: string) => {
      const index = categoryOrder.indexOf(name.toLowerCase());
      return index === -1 ? categoryOrder.length : index;
    };
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  for (const category of orderedCategories) {
    const group = [...(groups.get(category) ?? [])].sort(
      (a, b) =>
        (severityRank[severityOf(b.severity)] ?? 0) - (severityRank[severityOf(a.severity)] ?? 0),
    );
    ensure(80);
    y -= 4;
    text(`${category} (${group.length})`, { size: 12, color: teal, after: 4 });
    for (const finding of group) {
      ensure(90);
      const chipWidth = chip(
        severityOf(finding.severity),
        severityColor(finding.severity),
        LEFT,
        y,
      );
      text(finding.title, { size: 10.5, x: LEFT + chipWidth + 8, after: 2, lineHeight: 1.3 });
      const meta = [
        finding.confidence === undefined ? null : `Confidence ${percent(finding.confidence)}`,
        finding.detectionType ? `Detection: ${label(finding.detectionType)}` : null,
      ].filter(Boolean);
      if (meta.length) text(meta.join('  |  '), { size: 8.5, color: muted, after: 3 });
      labelled('Evidence', finding.evidence || 'No evidence text recorded.');
      if (finding.description) labelled('What it means', finding.description);
      if (finding.recommendation) labelled('Recommendation', finding.recommendation, teal);
      if (finding.sourceUrl) labelled('Source', finding.sourceUrl, muted);
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: LEFT + WIDTH, y },
        thickness: 0.4,
        color: rule,
      });
      y -= 8;
    }
  }

  // ---- Opportunities -----------------------------------------------------------------------
  heading('Service opportunities');
  if (!report.opportunities.length)
    text('No sufficiently grounded service opportunities were recorded.');
  for (const item of report.opportunities) {
    ensure(100);
    text(item.title, { size: 11.5, color: teal, after: 2 });
    ensure(16);
    let x = LEFT;
    if (item.strength) x += chip(`${item.strength} strength`, teal, x, y) + 8;
    page.drawText(
      clean(
        `${item.serviceCategory}  |  Opportunity Score ${item.opportunityScore} / 100  |  Confidence ${percent(item.confidence)}`,
      ),
      { x, y: y - 9, size: 8.5, font, color: muted },
    );
    y -= 20;
    if (item.summary) labelled('Summary', item.summary);
    labelled('Why it matters commercially', item.commercialReason);
    if (item.pitchAngle) labelled('Suggested approach', item.pitchAngle, teal);
    y -= 4;
  }

  // ---- Outreach drafts ---------------------------------------------------------------------
  if (report.pitches?.length) {
    heading('Outreach drafts');
    for (const pitch of report.pitches) {
      ensure(60);
      text(label(pitch.format), { size: 11, color: teal, after: 2 });
      text(pitch.content, { size: 9.5, after: 8 });
    }
  }

  // ---- Contact and technical signals -------------------------------------------------------
  const emails = [...new Set(pages.flatMap((entry) => entry.emails))].slice(0, 10);
  const phones = [...new Set(pages.flatMap((entry) => entry.phones))].slice(0, 10);
  const firstPage = pages[0];
  if (emails.length || phones.length || firstPage) {
    heading('Contact and technical signals');
    if (emails.length || phones.length) {
      text('Public contact details found on the analyzed pages', {
        size: 11,
        color: teal,
        after: 3,
      });
      if (emails.length) text(`Email: ${emails.join(', ')}`, { size: 9.5 });
      if (phones.length) text(`Phone: ${phones.join(', ')}`, { size: 9.5 });
    }
    if (firstPage) {
      y -= 4;
      text(`Security headers on ${firstPage.url}`, { size: 11, color: teal, after: 3 });
      const captured = Object.keys(firstPage.securityHeaders).map((key) => key.toLowerCase());
      if (!captured.length)
        text('Response header data was not captured for this page, so header status is unknown.', {
          size: 9.5,
          color: muted,
        });
      else
        table(
          [
            { title: 'Header', width: 165 },
            { title: 'Status', width: 60 },
            { title: 'Purpose', width: 270 },
          ],
          securityHeaderPurpose.map(([name, purpose]) => [
            name,
            captured.includes(name) ? 'Present' : 'Missing',
            purpose,
          ]),
        );
    }
  }

  // ---- Methodology and limitations ---------------------------------------------------------
  heading('How to read the scores');
  labelled(
    'Website Score (0-100)',
    "Every finding is rated by severity (Info to Critical) and by confidence. Within each of the nine components the score starts at 100 and is reduced by that component's findings (severity weight multiplied by confidence). The Website Score is the weighted average of the components and is also capped by the single most severe finding, so one serious problem cannot be fully averaged away.",
  );
  labelled(
    'Opportunity Score (0-100)',
    "Estimates how strongly a finding supports a service you could offer. It combines the finding's severity, the confidence in its evidence, its commercial relevance and how well the service matches the services in your ProspectAI profile (a neutral default is used when none are set).",
  );
  labelled(
    'Confidence',
    'Reflects how much evidence was gathered. It is capped by the number of pages analyzed (fewer pages means a lower ceiling) and is reduced when AI analysis was unavailable or pages were skipped.',
  );
  text('Scores are research indicators, not proof of purchase intent.', {
    size: 9.5,
    color: muted,
    after: 6,
  });

  heading('Limitations');
  const limitations = [...report.limitations];
  if (replacedCharacters > 0)
    limitations.push(
      `${replacedCharacters} characters from the website (for example non-Latin scripts or emoji) cannot be shown in this PDF and appear as "?". The full text is available in ProspectAI.`,
    );
  for (const limitation of limitations) text(`- ${limitation}`, { size: 9.5, after: 3 });
  text(
    'Findings describe the public page content returned during this analysis, not every page or any private business data.',
    { size: 9.5, color: muted, after: 6 },
  );
  text(`Generated by ProspectAI: ${generatedAt.toISOString()}`, { size: 8.5, color: muted });

  // ---- Running header and footer on every page ---------------------------------------------
  const pageList = document.getPages();
  for (const [index, current] of pageList.entries()) {
    current.drawImage(logo, { x: 50, y: 781, width: 22, height: 22 });
    current.drawText('ProspectAI', { x: 80, y: 787, size: 14, font, color: teal });
    current.drawText(clean(report.domain), {
      x: 545 - width(clean(report.domain), 9),
      y: 788,
      size: 9,
      font,
      color: muted,
    });
    current.drawLine({
      start: { x: 50, y: 767 },
      end: { x: 545, y: 767 },
      thickness: 0.8,
      color: rule,
    });
    current.drawText(`ProspectAI | Page ${index + 1} of ${pageList.length}`, {
      x: 50,
      y: 35,
      size: 8,
      font,
      color: ink,
    });
  }
  return document.save();
}
