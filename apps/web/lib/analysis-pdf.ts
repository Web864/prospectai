import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from 'pdf-lib';
import { AppError } from '@prospectai/shared';

export interface AnalysisPdfReport {
  domain: string;
  url: string;
  analyzedAt: Date | null;
  status: 'COMPLETED' | 'PARTIAL';
  websiteScore: number | null;
  opportunityScore: number | null;
  confidence: number | null;
  summary: string | null;
  limitations: string[];
  findings: Array<{
    category: string;
    title: string;
    description: string | null;
    evidence: string;
    sourceUrl: string | null;
  }>;
  opportunities: Array<{
    title: string;
    serviceCategory: string;
    commercialReason: string;
    pitchAngle: string | null;
    opportunityScore: number;
    confidence: number;
  }>;
}

export function reportFilename(domain: string) {
  const safe =
    domain
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/^[.-]+/, '')
      .slice(0, 100) || 'prospect';
  return `ProspectAI-${safe}-analysis.pdf`;
}

export async function generateAnalysisPdf(report: AnalysisPdfReport, generatedAt = new Date()) {
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
  document.setCreationDate(generatedAt);
  const teal = rgb(0, 0.46, 0.4);
  const ink = rgb(0.07, 0.12, 0.2);
  let page = document.addPage([595.28, 841.89]);
  let y = 735;
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
    if (document.getPageCount() >= 200)
      throw new AppError('VALIDATION_ERROR', 'This report exceeds the PDF page limit.', 422);
    page = document.addPage([595.28, 841.89]);
    y = 735;
  };
  const text = (value: string, size = 10, color = ink) => {
    textLength += value.length;
    if (textLength > 500_000)
      throw new AppError('VALIDATION_ERROR', 'This report exceeds the PDF text limit.', 422);
    // Wrap using actual glyph widths, including long unbroken URLs.
    for (const paragraph of value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (width(candidate, size) <= 495) {
          line = candidate;
          continue;
        }
        if (line) {
          draw(line, size, color);
          line = '';
        }
        for (const character of word) {
          if (width(line + character, size) > 495) {
            draw(line, size, color);
            line = '';
          }
          line += character;
        }
      }
      if (line) draw(line, size, color);
      y -= 5;
    }
  };
  const draw = (line: string, size: number, color: ReturnType<typeof rgb>) => {
    if (y < 65) newPage();
    page.drawText(line, { x: 50, y, size, font, color });
    y -= size * 1.5;
  };
  const section = (title: string) => {
    if (y < 125) newPage();
    y -= 14;
    text(title, 13, teal);
    y -= 4;
  };
  text('Opportunity Intelligence Report', 22);
  text(report.domain, 16, teal);
  text(`Analysis date: ${report.analyzedAt?.toISOString() ?? 'Not recorded'}`);
  text(`Status: ${report.status}`);
  section('Executive summary');
  text(report.summary ?? 'No business summary was recorded.');
  text(`Website Score: ${report.websiteScore ?? 'Not available'} / 100`);
  text(`Opportunity Score: ${report.opportunityScore ?? 'Not available'} / 100`);
  text(
    `Confidence: ${report.confidence === null ? 'Not available' : `${Math.round(report.confidence * 100)}%`}`,
  );
  section('Prospect overview');
  text(`Website: ${report.domain}`);
  text(`Source URL: ${report.url}`);
  section('Findings and evidence');
  if (!report.findings.length)
    text('No findings were recorded. This does not establish that the website is free of issues.');
  for (const finding of report.findings) {
    if (y < 140) newPage();
    text(`${finding.category} - ${finding.title}`, 11, teal);
    text(`Evidence: ${finding.evidence || 'No evidence text recorded.'}`);
    if (finding.description) text(`Interpretation: ${finding.description}`);
    if (finding.sourceUrl) text(`Source: ${finding.sourceUrl}`);
    y -= 8;
  }
  section('Service opportunities');
  if (!report.opportunities.length)
    text('No sufficiently grounded service opportunities were recorded.');
  for (const opportunity of report.opportunities) {
    text(opportunity.title, 11, teal);
    text(`Service: ${opportunity.serviceCategory}`);
    text(`Commercial reason: ${opportunity.commercialReason}`);
    text(
      `Opportunity Score: ${opportunity.opportunityScore} / 100; confidence ${Math.round(opportunity.confidence * 100)}%`,
    );
    if (opportunity.pitchAngle) text(`Pitch angle: ${opportunity.pitchAngle}`);
    y -= 8;
  }
  section('Scoring');
  text(
    'Website Score summarizes observed website signals. Opportunity Score summarizes the supported service opportunities. Scores are research indicators, not proof of purchase intent.',
  );
  section('Limitations');
  for (const limitation of report.limitations) text(limitation);
  text(
    'Findings describe the public page content returned during this analysis, not every page or private business data.',
  );
  text(`Generated by ProspectAI: ${generatedAt.toISOString()}`, 9);
  const pages = document.getPages();
  for (const [index, current] of pages.entries()) {
    current.drawImage(logo, { x: 50, y: 781, width: 22, height: 22 });
    current.drawText('ProspectAI', { x: 80, y: 787, size: 14, font, color: teal });
    current.drawLine({
      start: { x: 50, y: 767 },
      end: { x: 545, y: 767 },
      thickness: 0.8,
      color: rgb(0.85, 0.89, 0.9),
    });
    current.drawText(`ProspectAI | Page ${index + 1} of ${pages.length}`, {
      x: 50,
      y: 35,
      size: 8,
      font,
      color: ink,
    });
  }
  return document.save();
}
