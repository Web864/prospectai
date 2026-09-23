import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  Database,
  FileText,
  Lightbulb,
  Mail,
  Monitor,
  Rocket,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';
import { prospectFaqQuestions } from './marketing-views';

const featureCards = [
  {
    title: 'Evidence first',
    copy: 'See the specific signals ProspectAI detected before considering a recommendation.',
    icon: Search,
    tone: 'teal',
  },
  {
    title: 'Commercial interpretation',
    copy: "Understand why a website issue may matter to the prospect's business.",
    icon: Building2,
    tone: 'violet',
  },
  {
    title: 'Services worth selling',
    copy: 'Prioritize grounded opportunities that fit the services you actually offer.',
    icon: TrendingUp,
    tone: 'blue',
  },
] as const;



const resourceCards = [
  {
    title: 'Evidence first',
    copy: 'See the specific signals ProspectAI detected before considering a recommendation.',
    icon: BarChart3,
  },
  {
    title: 'Commercial interpretation',
    copy: "Understand why a website issue may matter to the prospect's business.",
    icon: FileText,
  },
  {
    title: 'Services worth selling',
    copy: 'Prioritize grounded opportunities that fit the services you actually offer.',
    icon: Target,
  },
] as const;

const plans = [
  {
    name: 'Free',
    copy: 'Explore the core workflow.',
    cta: 'Start free',
    href: '/signup',
    icon: Rocket,
    featured: false,
  },
  {
    name: 'Pro / Individual',
    copy: 'Consistent prospecting for one professional.',
    cta: 'Choose plan',
    href: '/signup?plan=pro',
    icon: UserRound,
    featured: true,
  },
  {
    name: 'Agency',
    copy: 'Shared capacity for a growing team.',
    cta: 'Choose plan',
    href: '/signup?plan=agency',
    icon: Users,
    featured: false,
  },
] as const;

const faqIcons = [
  BarChart3,
  Target,
  Mail,
  Database,
  Monitor,
  CircleHelp,
  Check,
  Lightbulb,
  BookOpen,
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
          <FeatureIllustration />
        </section>

        <section className="reference-feature-grid" aria-label="ProspectAI feature principles">
          {featureCards.map(({ title, copy, icon: Icon, tone }, index) => (
            <article
              className={`reference-feature-card reference-card-${tone} reference-enter`}
              style={{ animationDelay: `${280 + index * 90}ms` }}
              key={title}
            >
              <IconTile icon={Icon} tone={tone} />
              <h2>{title}</h2>
              <p>{copy}</p>
              <Link href="/how-it-works" aria-label={`Learn more about ${title}`}>
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
              Talk to the <span>ProspectAI</span> team
            </h1>
            <p>Built for freelancers, agencies, consultants, and small sales teams.</p>
          </div>
        </section>

        <section className="reference-resources-grid" aria-label="ProspectAI principles">
          {resourceCards.map(({ title, copy, icon: Icon }, index) => (
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
              <Link className="reference-resource-arrow" href="/how-it-works" aria-label={`Learn more about ${title}`}>
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
          <PricingIllustration />
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
              <Link className="reference-primary-button" href={href}>
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

export function FaqPage() {
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
          <FaqIllustration />
        </section>

        <section className="reference-faq-list" aria-label="ProspectAI frequently asked questions">
          {prospectFaqQuestions.map(([question, answer], index) => {
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

function FeatureIllustration() {
  return (
    <div
      className="reference-visual feature-visual reference-enter reference-enter-2"
      aria-hidden="true"
    >
      <span className="visual-shape visual-shape-one" />
      <span className="visual-shape visual-shape-two" />
      <div className="signal-browser">
        <div className="signal-browser-bar">
          <i /> <i /> <i />
        </div>
        <div className="signal-browser-company">
          <Building2 size={27} />
          <span>
            <b /> <b />
          </span>
          <em>
            <Sparkles size={13} /> High intent
          </em>
        </div>
        {['Pricing page detected', 'Core service understood', 'Company profile matched'].map(
          (label) => (
            <div className="signal-row" key={label}>
              <span>
                <FileSignalIcon />
              </span>
              <strong>{label}</strong>
              <Check size={16} />
            </div>
          ),
        )}
      </div>
      <span className="floating-tile floating-mail">
        <Mail size={34} />
      </span>
      <span className="floating-tile floating-target">
        <Target size={38} />
      </span>
      <span className="floating-chart">
        <TrendingUp size={53} />
      </span>
    </div>
  );
}

function PricingIllustration() {
  return (
    <div
      className="reference-visual pricing-visual reference-enter reference-enter-2"
      aria-hidden="true"
    >
      <span className="visual-shape visual-shape-one" />
      <span className="visual-shape visual-shape-two" />
      <div className="pricing-result-card">
        <div>
          <Users size={24} />
          <span>
            <b />
            <b />
          </span>
        </div>
        <BarChart3 size={82} />
      </div>
      <span className="pricing-result-note">
        <Sparkles size={16} /> More leads
        <br />
        Better results
      </span>
      <span className="floating-tile pricing-target">
        <Target size={39} />
      </span>
    </div>
  );
}

function FaqIllustration() {
  return (
    <div
      className="reference-visual faq-visual reference-enter reference-enter-2"
      aria-hidden="true"
    >
      <span className="visual-shape visual-shape-one" />
      <div className="faq-question-card">
        <span>
          <CircleHelp size={42} />
        </span>
        <div>
          <b />
          <b />
          <b />
          <b />
        </div>
      </div>
      <span className="floating-tile faq-book">
        <BookOpen size={34} />
      </span>
      <span className="floating-tile faq-light">
        <Lightbulb size={34} />
      </span>
      <span className="floating-tile faq-support">
        <CircleHelp size={34} />
      </span>
    </div>
  );
}

function FileSignalIcon() {
  return <BarChart3 size={14} />;
}
