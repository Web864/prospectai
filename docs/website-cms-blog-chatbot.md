# Website redesign, CMS, blog and assistant

This covers the November 2026 website work: the animated design layer, the self-hosted content admin, the blog and keyword landing pages, the visitor assistant, and the SEO keyword plan.

## 1. Design and motion

`components/motion-layer.tsx` and `app/motion.css` bring the Chrome extension's look to the site and workspace:

- A soft spotlight follows the pointer, and the card under the pointer lights up from the cursor position.
- Primary buttons get a light sweep on hover. Cards lift on hover with a gradient edge.
- Public pages add an aurora with a faint grid behind the hero, animated gradient headline accents, a glass nav that firms up on scroll, and sections that rise into view.
- The workspace gets only the restrained subset: card light and lift, button sweep and a live edge on the active nav item. It has no scroll reveals and no aurora, so it stays fast.
- Overlays use blend modes (multiply in light, screen in dark), so they tint backgrounds without washing out text.
- Under `prefers-reduced-motion` all of it is off. Without JavaScript, every section is fully visible.

## 2. Content admin (`/admin`)

Content lives in the same self-hosted Postgres as the product, in the `SitePage` and `SiteFaq` tables (migration `20261126000000_site_content`). No external CMS and no extra recurring fee.

**Access.** A user must be signed in, have a verified email, and that email must be listed in `SITE_ADMIN_EMAILS`. It reuses the existing hashed passwords, sessions, rate limits and Google sign-in. Leave the variable empty and nobody can open `/admin`. The verified-email rule stops someone registering an allowlisted address before its owner does.

**Setup on a server:**

```bash
# .env
SITE_ADMIN_EMAILS=you@yourdomain.com
pnpm --filter @prospectai/database exec prisma migrate deploy
pnpm --filter @prospectai/database seed:site   # optional: starter drafts, see below
```

**What you can manage:**

| Content       | Public URL              | Notes                                                                 |
| ------------- | ----------------------- | --------------------------------------------------------------------- |
| Blog posts    | `/blog`, `/blog/[slug]` | Markdown, tags, author, SEO title and description, draft or published |
| Landing pages | `/solutions/[slug]`     | Same editor. Use these for keyword pages                              |
| FAQ answers   | `/faq`                  | Merged after the built-in questions and emitted as FAQPage schema     |

Every create, update and delete writes an audit log entry. Public pages revalidate within 60 seconds, and so does the sitemap, so you never need a redeploy to publish.

**Markdown.** `lib/markdown.ts` is a small, dependency-free renderer that escapes first. Raw HTML shows as text, and only http(s), mailto and site-relative links are allowed. External links get `rel="noopener noreferrer nofollow"`.

**Starter drafts.** `seed:site` adds three landing page drafts and three FAQ drafts (see the keyword plan below). They stay as drafts until you review and publish them.

## 3. Blog SEO

- Each post has a canonical URL, Open Graph article metadata, BlogPosting and BreadcrumbList JSON-LD, a table of contents built from its headings, and a reading time.
- `/blog` is in the main navigation and footer. Published posts and landing pages are added to `sitemap.xml` with `lastModified`.
- `/admin` is `noindex` and disallowed in robots.txt.

## 4. Website assistant

The floating assistant appears on public pages (`components/site-assistant.tsx`) and calls `POST /api/v1/site-assistant`.

**Grounding.** The knowledge base is limited to approved site content: the public page descriptions, the built-in FAQ, plan allowances, published FAQ answers, and published landing pages and blog posts. A small BM25-style ranker in `lib/site-assistant.ts` picks the best passages. No vector database or extra service is needed.

- **With an AI provider key** (`AI_PROVIDER` plus `GEMINI_API_KEY` or `OPENAI_API_KEY`), the model answers only from the numbered sources it is given. It treats that content as data, not instructions, refuses off-topic requests, returns which sources it used, and is capped at 400 output tokens.
- **Without a key, or if the provider fails,** it replies with the best matching approved passage word for word. If nothing matches well enough, it says the site doesn't cover the question and links to `/contact`. It never invents an answer.

**Safety limits.** Each visitor gets 12 questions per 10 minutes. A ceiling of 2,000 questions per day across the whole site caps AI spend. Browser requests must come from the site's own origin. Messages are limited to 500 characters and history to 6 turns. Set `SITE_CHATBOT_ENABLED=false` to hide the assistant.

To teach it something new, publish an FAQ answer in `/admin/faq`. That is also the easiest way to correct a wrong answer.

## 5. SEO, AEO and GEO keyword plan

ProspectAI's buyers are freelancers, agencies and consultants who sell web, SEO, marketing and AI-automation services. The keyword plan targets what they search for when they need clients, plus the AI-agency topics you want to write about.

> **No search volume, CPC or difficulty figures are listed here on purpose.** None were measured. Before you prioritise, check each term in Google Keyword Planner (free with a Google Ads account), Google Search Console once the site is indexed, or a free keyword tool such as Ahrefs' or Semrush's free tier. Prefer terms with steady volume, low CPC and low difficulty, and long-tail variants.

| Cluster                                   | Example terms to verify                                                                                                                                      | Where it goes                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Find clients (problem aware)              | how to find clients for web design business · how to get SEO clients · lead generation for digital agencies · find clients for AI automation agency          | Blog posts and `/solutions/find-clients-for-ai-automation-agency`                                      |
| Tools (solution aware)                    | AI prospecting tool · AI sales prospecting for agencies · website audit tool for agencies · website audit lead generation · white label website audit report | `/solutions/ai-prospecting-tool-for-agencies`, `/solutions/website-audit-lead-generation`, `/features` |
| Outreach                                  | personalized cold outreach with AI · SEO audit cold email · cold email for web design clients                                                                | Blog posts that link to `/how-it-works`                                                                |
| AI agency and Claude (thought leadership) | how to start an AI automation agency · AI consultant for small business · Claude for agencies · Claude vs ChatGPT for client work                            | Your opinion posts on `/blog`                                                                          |

**On-page checklist for each new page:**

- One H1 (the title). Use H2 sections written as the questions people ask, which helps AEO.
- Answer the question in the first two sentences of each section. AI answer engines quote these.
- Put the primary term in the SEO title (under 60 characters), the meta description (140 to 160 characters), the slug and the first paragraph.
- Link to one product page and one related post.
- Add two or three FAQ answers in `/admin/faq` for the questions the page answers.

**AEO and GEO** (being cited by AI search such as Google AI Overviews, ChatGPT search, Perplexity and Claude):

- Make plain factual statements about what ProspectAI does and doesn't do. The FAQ and How it works pages already do this.
- Use structured data: Organization, WebSite and SoftwareApplication on the home page, FAQPage on `/faq`, BlogPosting and BreadcrumbList on posts.
- Keep pages server-rendered so content is readable without JavaScript.
- Show an author name and dates on opinion posts.

**Off-page** (you have to do these yourself): list the extension in the Chrome Web Store, submit to SaaS directories (Product Hunt, G2, Capterra and AI tool directories), post useful answers in agency communities, and guest-post on agency blogs with a link to a relevant `/solutions` page.

### Keyword research prompt (adapted from the original brief)

> Act as an SEO strategist for ProspectAI, a SaaS that analyzes a business website and turns the evidence into service opportunities and outreach drafts for freelancers, agencies and consultants. Using real keyword data from [tool name and export attached], list 30 keywords across these intents: finding clients for web design, SEO and AI-automation agencies; AI prospecting and website audit tools; and AI-agency thought leadership (including Claude). For each, give monthly volume, CPC, difficulty and intent **as shown in the data**. Rank by (volume × low difficulty × low CPC), group them into clusters, and map each cluster to an existing page or a new `/solutions/[slug]` or `/blog/[slug]` URL with a suggested title and H2 outline. Do not estimate any metric that is not in the data.
