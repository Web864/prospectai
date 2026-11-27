// Seeds starter website content as DRAFTS: three keyword landing pages and a few FAQ answers.
// Idempotent: anything that already exists (same kind + slug, or same question) is left alone.
// Run: pnpm --filter @prospectai/database seed:site
// Then review, edit and publish each item in /admin. Nothing here is published automatically.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const landingPages = [
  {
    slug: 'ai-prospecting-tool-for-agencies',
    title: 'AI prospecting tool for agencies: find clients from website evidence',
    excerpt:
      'ProspectAI reads a prospect’s public website, records what it finds and turns it into a service opportunity and an outreach draft your agency can review and send.',
    seoTitle: 'AI Prospecting Tool for Agencies | ProspectAI',
    seoDescription:
      'Find agency clients with evidence, not guesswork. ProspectAI audits a prospect’s website, scores the opportunity and drafts a pitch you review before sending.',
    tags: ['AI prospecting', 'Agencies', 'Lead generation'],
    body: `## Why agencies struggle to prospect

Cold outreach fails when it is generic. The best opening line is a specific, verifiable observation about the prospect’s own website, and finding one by hand takes time.

## What ProspectAI does

1. You enter a business website (or open it with the Chrome extension).
2. ProspectAI crawls the public pages and records technical, SEO, accessibility, mobile, trust and conversion findings, each with the page and the evidence behind it.
3. Transparent rules score the opportunity, so you can see why a prospect ranks high.
4. AI explains why the findings matter to that business and drafts a pitch. You edit and send it yourself.

## Who it is for

- Web design and development agencies
- SEO and marketing agencies
- AI and automation agencies looking for businesses with clear gaps

## Start free

The Free plan includes monthly website analyses with no credit card. [Compare plans](/pricing) or [see how it works](/how-it-works).`,
  },
  {
    slug: 'website-audit-lead-generation',
    title: 'Website audit lead generation: turn audits into qualified conversations',
    excerpt:
      'Use a short, evidence-based website audit as the reason to start a sales conversation, without spending an hour per prospect.',
    seoTitle: 'Website Audit Lead Generation for Agencies | ProspectAI',
    seoDescription:
      'Generate leads with website audits. ProspectAI finds real issues on a prospect’s site, explains why they matter and exports a PDF report you can share.',
    tags: ['Website audit', 'Lead generation', 'SEO agencies'],
    body: `## The audit is the hook

A prospect is far more likely to reply when you show them something true about their own site. A full audit is too much work to do on spec; a focused one is not.

## How ProspectAI helps

- **Evidence you can verify:** every finding links to the page and observation behind it.
- **Commercial context:** each finding explains why it may matter to the business.
- **Shareable report:** export a PDF to attach to your outreach.

## Validate before you pitch

Open the page behind the finding and confirm it yourself. Lead with one specific angle rather than a long list. Read more in our [resources](/resources).`,
  },
  {
    slug: 'find-clients-for-ai-automation-agency',
    title: 'How to find clients for an AI automation agency',
    excerpt:
      'Businesses with slow forms, no booking flow or unanswered contact paths are natural fits for automation. Here is how to find them and open the conversation.',
    seoTitle: 'Find Clients for Your AI Automation Agency | ProspectAI',
    seoDescription:
      'Find businesses that need AI automation by reading their websites for missing booking, contact and conversion paths, then pitch with evidence.',
    tags: ['AI agency', 'Automation', 'Client acquisition'],
    body: `## Look for visible friction

An automation offer lands when the prospect already feels the pain. Their website often shows it: no online booking, contact forms that go nowhere, no clear next step for a visitor.

## Use ProspectAI to spot it

ProspectAI checks conversion and trust signals on a business website and records what is missing, so you can match it to the automation services you sell.

## Open with one concrete observation

Say what you saw, why it costs them, and offer a small next step. [Start free](/signup).`,
  },
];

const faqs = [
  {
    question: 'Does ProspectAI send emails for me?',
    answer:
      'No. ProspectAI drafts a pitch from the evidence it found, and you review, edit and send it yourself.',
  },
  {
    question: 'Is the opportunity score decided by AI?',
    answer:
      'No. The score is calculated by transparent rules from the findings. AI helps explain why findings matter and drafts outreach.',
  },
  {
    question: 'Is there a Chrome extension?',
    answer:
      'Yes. The Chrome extension analyzes the website in your current tab and opens the full report in your workspace.',
  },
];

let created = 0;
for (const page of landingPages) {
  const exists = await prisma.sitePage.findUnique({
    where: { kind_slug: { kind: 'LANDING_PAGE', slug: page.slug } },
  });
  if (exists) continue;
  await prisma.sitePage.create({ data: { ...page, kind: 'LANDING_PAGE', status: 'DRAFT' } });
  created += 1;
}
for (const [index, faq] of faqs.entries()) {
  const exists = await prisma.siteFaq.findFirst({ where: { question: faq.question } });
  if (exists) continue;
  await prisma.siteFaq.create({ data: { ...faq, sortOrder: (index + 1) * 10, status: 'DRAFT' } });
  created += 1;
}
console.log(`Seeded ${created} draft item(s). Review and publish them in /admin.`);
await prisma.$disconnect();
