import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  ChevronDown,
  CircleHelp,
  Database,
  FileText,
  Monitor,
  Rocket,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';
import { FaqHeroGraphic, FeaturesHeroGraphic, PricingHeroGraphic } from './hero-graphics';
import { prospectFaqQuestions } from './marketing-views';

const featureCards = [
  {
    title: 'Evidence first',
    copy: 'Technical, SEO, accessibility, mobile, trust, conversion and performance checks across the site, each stored with the page and the observation behind it.',
    icon: Search,
    tone: 'teal',
    href: '/how-it-works',
  },
  {
    title: 'Commercial interpretation',
    copy: "Every finding explains why it may matter to the prospect's business, and the opportunity score is calculated by transparent rules rather than an AI guess.",
    icon: Building2,
    tone: 'violet',
    href: '/how-it-works',
  },
  {
    title: 'Services worth selling',
    copy: 'Opportunities match the services you sell. Save the prospect, draft a pitch from the evidence, and export a PDF report to share.',
    icon: TrendingUp,
    tone: 'blue',
    href: '/pricing',
  },
] as const;

const resourceCards = [
  {
    title: 'Read an opportunity score',
    copy: 'The score weighs how severe and how commercially relevant each finding is. Treat a high score as a reason to look closer, not as proof the business will buy.',
    icon: BarChart3,
    href: '/faq',
  },
  {
    title: 'Validate before you pitch',
    copy: 'Open the page behind each finding and confirm it yourself. A missing meta description on one page is a detail; a site with no clear way to contact the business is a conversation.',
    icon: FileText,
    href: '/how-it-works',
  },
  {
    title: 'Lead with one specific angle',
    copy: 'Pick the single finding that best matches a service you sell, say what you saw and why it matters, and offer a small next step instead of a full proposal.',
    icon: Target,
    href: '/features',
  },
] as const;

const analysisAllowance = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

const plans = [
  {
    name: 'Free',
    copy: `Explore the core workflow with ${analysisAllowance(process.env.FREE_MONTHLY_ANALYSIS_LIMIT, 10)} website analyses a month.`,
    cta: 'Start free',
    href: '/signup',
    icon: Rocket,
    featured: false,
  },
  {
    name: 'Pro / Individual',
    copy: `Consistent prospecting for one professional: ${analysisAllowance(process.env.PRO_MONTHLY_ANALYSIS_LIMIT, 100)} analyses a month.`,
    cta: 'Choose plan',
    href: '/signup?plan=pro',
    icon: UserRound,
    featured: true,
  },
  {
    name: 'Agency',
    copy: `Shared capacity for a growing team: ${analysisAllowance(process.env.AGENCY_MONTHLY_ANALYSIS_LIMIT, 500)} analyses a month.`,
    cta: 'Choose plan',
    href: '/signup?plan=agency',
    icon: Users,
    featured: false,
  },
] as const;

const faqIcons = [
  BarChart3,
  Target,
  Database,
  Monitor,
  CircleHelp,
] as const;

export function FeaturesPage() {
  return (
    <main className="reference-page reference-features">
      <div className="reference-grid-pattern reference-pattern-left" aria-hidden="true" />
      <div className="reference-grid-pattern reference-pattern-right" aria-hidden="true" />
      <div className="reference-container">
        <section className="reference-hero-grid" aria-labelledby="features-page-title">
          <div className="reference-heading reference-enter reference-enter-1">
            <ReferenceEyebrow />
            <h1 id="features-page-title">
              From website signals to <span>credible sales opportunities</span>
            </h1>
            <p>Built for freelancers, agencies, consultants, and small sales teams.</p>
          </div>
          <FeaturesHeroGraphic />
        </section>

        <section className="reference-feature-grid" aria-label="ProspectAI feature principles">
          {featureCards.map(({ title, copy, icon: Icon, tone, href }, index) => (
            <article
              className={`reference-feature-card reference-card-${tone} reference-enter`}
              style={{ animationDelay: `${280 + index * 90}ms` }}
              key={title}
            >
              <IconTile icon={Icon} tone={tone} />
              <h2>{title}</h2>
              <p>{copy}</p>
              <Link href={href} aria-label={`Learn more about ${title}`}>
                <ArrowRight size={21} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

export function ResourcesPage() {
  return (
    <main className="reference-page reference-resources">
      <ResourcesBackdrop />
      <div className="reference-container reference-resources-container">
        <section className="reference-resources-hero" aria-labelledby="resources-page-title">
          <div className="reference-heading reference-enter reference-enter-1">
            <span className="reference-resources-eyebrow">ProspectAI</span>
            <h1 id="resources-page-title">
              Prospecting with <span>website evidence</span>
            </h1>
            <p>Built for freelancers, agencies, consultants, and small sales teams.</p>
          </div>
        </section>

        <section className="reference-resources-grid" aria-label="ProspectAI principles">
          {resourceCards.map(({ title, copy, icon: Icon, href }, index) => (
            <article
              className="reference-resource-card reference-enter"
              style={{ animationDelay: `${210 + index * 90}ms` }}
              key={title}
            >
              <span className="reference-resource-icon" aria-hidden="true">
                <Icon size={31} strokeWidth={2.25} />
              </span>
              <h2>{title}</h2>
              <p>{copy}</p>
              <Link
                className="reference-resource-arrow"
                href={href}
                aria-label={`Learn more about ${title}`}
              >
                <ArrowRight size={22} strokeWidth={2.35} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function ResourcesBackdrop() {
  return (
    <svg
      className="reference-resources-backdrop"
      viewBox="0 0 1672 850"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="resources-mint-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dff8f1" stopOpacity="0.9" />
          <stop offset="1" stopColor="#b9ece0" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient id="resources-mint-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#caefe7" stopOpacity="0.78" />
          <stop offset="1" stopColor="#eefbf8" stopOpacity="0.22" />
        </linearGradient>
        <filter id="resources-soft-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="18" stdDeviation="26" floodColor="#159d88" floodOpacity="0.10" />
        </filter>
      </defs>
      <path
        d="M1672 20C1480 46 1324 121 1210 245c-81 88-132 179-226 225 127 33 267 12 381-52 137-77 213-191 307-223V20Z"
        fill="url(#resources-mint-a)"
        filter="url(#resources-soft-shadow)"
      />
      <path
        d="M1672 270c-152 20-266 76-351 167-77 83-130 183-248 219 139 28 288 2 401-76 83-57 143-138 198-183V270Z"
        fill="url(#resources-mint-b)"
      />
      <path
        d="M0 486c120 26 219 82 292 165 55 63 106 133 202 169H0V486Z"
        fill="url(#resources-mint-a)"
        opacity="0.74"
      />
      <g fill="#87d7c8" opacity="0.31">
        {Array.from({ length: 4 }).map((_, row) =>
          Array.from({ length: 4 }).map((__, col) => (
            <circle key={`left-${row}-${col}`} cx={40 + col * 19} cy={196 + row * 19} r="2.3" />
          )),
        )}
        {Array.from({ length: 4 }).map((_, row) =>
          Array.from({ length: 5 }).map((__, col) => (
            <circle key={`right-${row}-${col}`} cx={1512 + col * 22} cy={143 + row * 24} r="2.5" />
          )),
        )}
      </g>
    </svg>
  );
}

export function PricingPage() {
  return (
    <main className="reference-page reference-pricing">
      <div className="reference-container">
        <section
          className="reference-hero-grid reference-pricing-heading"
          aria-labelledby="pricing-page-title"
        >
          <div className="reference-heading reference-enter reference-enter-1">
            <ReferenceEyebrow />
            <h1 id="pricing-page-title">
              Start free, scale when <span>prospecting works</span>
            </h1>
            <p>Built for freelancers, agencies, consultants, and small sales teams.</p>
          </div>
          <PricingHeroGraphic
            plans={[
              {
                name: 'Free',
                analyses: analysisAllowance(process.env.FREE_MONTHLY_ANALYSIS_LIMIT, 10),
              },
              {
                name: 'Pro',
                analyses: analysisAllowance(process.env.PRO_MONTHLY_ANALYSIS_LIMIT, 100),
              },
              {
                name: 'Agency',
                analyses: analysisAllowance(process.env.AGENCY_MONTHLY_ANALYSIS_LIMIT, 500),
              },
            ]}
          />
        </section>

        <section className="reference-plan-grid" aria-label="ProspectAI plans">
          {plans.map(({ name, copy, cta, href, icon: Icon, ...plan }, index) => (
            <article
              className={`reference-plan ${plan.featured ? 'is-featured' : ''} reference-enter`}
              style={{ animationDelay: `${260 + index * 90}ms` }}
              key={name}
            >
              <div className="reference-plan-topline">
                <IconTile icon={Icon} tone={plan.featured ? 'violet' : 'green'} />
                {plan.featured && (
                  <span className="reference-popular">
                    <Sparkles size={13} /> Most popular
                  </span>
                )}
              </div>
              <h2>{name}</h2>
              <p>{copy}</p>
              <Link className="button button-primary reference-plan-action" href={href}>
                {cta} <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <span className="reference-card-arc" aria-hidden="true" />
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

export function FaqPage({
  questions = prospectFaqQuestions,
}: {
  questions?: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <main className="reference-page reference-faq">
      <div className="reference-grid-pattern reference-pattern-left" aria-hidden="true" />
      <div className="reference-grid-pattern reference-pattern-right" aria-hidden="true" />
      <div className="reference-container reference-faq-container">
        <section
          className="reference-hero-grid reference-faq-heading"
          aria-labelledby="faq-page-title"
        >
          <div className="reference-heading reference-enter reference-enter-1">
            <ReferenceEyebrow />
            <h1 id="faq-page-title">
              Questions, answered <span>plainly</span>
            </h1>
            <p>Built for freelancers, agencies, consultants, and small sales teams.</p>
          </div>
          <FaqHeroGraphic />
        </section>

        <section className="reference-faq-list" aria-label="ProspectAI frequently asked questions">
          {questions.map(([question, answer], index) => {
            const Icon = faqIcons[index] ?? CircleHelp;
            return (
              <details
                className="reference-faq-item reference-enter"
                style={{ animationDelay: `${220 + index * 55}ms` }}
                key={question}
              >
                <summary>
                  <span className="reference-faq-icon">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <strong>{question}</strong>
                  <ChevronDown className="reference-faq-chevron" size={21} aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function ReferenceEyebrow() {
  return (
    <span className="reference-eyebrow">
      <Sparkles size={16} aria-hidden="true" /> ProspectAI
    </span>
  );
}

function IconTile({ icon: Icon, tone }: { icon: LucideIcon; tone: string }) {
  return (
    <span className={`reference-icon reference-icon-${tone}`}>
      <Icon size={30} strokeWidth={2.3} aria-hidden="true" />
    </span>
  );
}
