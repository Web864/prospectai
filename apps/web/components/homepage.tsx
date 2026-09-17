import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Chrome,
  FileSearch,
  Gauge,
  Lightbulb,
  LockKeyhole,
  Megaphone,
  MousePointer2,
  Rocket,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { AnimatedSection } from './animated-section';
import { FaqView, HowItWorksView } from './marketing-views';
import { PitchPreview } from './pitch-preview';
import { ProductPreview } from './product-preview';

const values = [
  [
    'Evidence',
    'See the website signal, its source, and the confidence behind it.',
    ScanSearch,
    'blue',
  ],
  [
    'Interpretation',
    'Understand what that signal may mean without inflated claims.',
    Lightbulb,
    'violet',
  ],
  [
    'Opportunity',
    'Match credible business needs to services you can reasonably offer.',
    Rocket,
    'green',
  ],
] as const;

const audiences = [
  [
    'Freelancers',
    'Replace open-ended research with a grounded reason to start a conversation.',
    BriefcaseBusiness,
  ],
  [
    'Agencies',
    'Qualify websites consistently and align opportunities with the right service line.',
    Building2,
  ],
  [
    'Consultants',
    'Turn observable signals into a sharper diagnosis and a more relevant first call.',
    Users,
  ],
  [
    'Small Sales Teams',
    'Give focused reps credible context without automating the human judgment.',
    Megaphone,
  ],
] as const;

export function Homepage() {
  return (
    <main className="homepage">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-grid-texture" aria-hidden="true" />
        <div className="home-container hero-stage">
          <div className="hero-copy">
            <span className="hero-eyebrow hero-enter hero-enter-1">
              <Sparkles size={16} /> AI Prospect Opportunity Intelligence
            </span>
            <h1 className="hero-enter hero-enter-2" id="home-title">
              Know <span>what service to sell</span> before you write the first message.
            </h1>
            <p className="hero-lede hero-enter hero-enter-3">
              ProspectAI analyzes business websites, detects evidence-backed needs, matches them to
              relevant services, and helps you write outreach grounded in what you actually found.
            </p>
            <div className="hero-actions hero-enter hero-enter-4">
              <Link className="home-button home-button-primary" href="/signup">
                Start analyzing <ArrowRight size={18} />
              </Link>
              <Link className="home-button home-button-secondary" href="/how-it-works">
                <MousePointer2 size={18} /> See how it works
              </Link>
            </div>
            <ul className="hero-trust hero-enter hero-enter-4" aria-label="Product highlights">
              <li>
                <Chrome size={16} /> Save hours of research
              </li>
              <li>
                <ShieldCheck size={16} /> Backed by real web data
              </li>
              <li>
                <CheckCircle2 size={16} /> Trusted by builders
              </li>
            </ul>
          </div>
          <div className="hero-product hero-enter hero-enter-product">
            <span className="hero-note hero-note-top" aria-hidden="true">
              From website to opportunity
            </span>
            <ProductPreview />
            <span className="hero-note hero-note-bottom" aria-hidden="true">
              Evidence before outreach
            </span>
          </div>
        </div>
      </section>

      <AnimatedSection className="home-container value-band is-visible">
        <div className="value-intro">
          <span>One clear reasoning chain</span>
          <strong>Evidence → Interpretation → Opportunity</strong>
        </div>
        <div className="value-grid">
          {values.map(([title, copy, Icon, tone]) => (
            <article className="value-card" key={title}>
              <span className={`home-icon home-icon-${tone}`}>
                <Icon size={24} />
              </span>
              <div>
                <h2>{title}</h2>
                <p>{copy}</p>
              </div>
              <ArrowRight className="card-arrow" size={18} />
            </article>
          ))}
        </div>
      </AnimatedSection>

      <AnimatedSection className="home-section home-container workflow-section">
        <SectionHeading
          eyebrow="A focused workflow"
          title="Move from browsing to a credible sales angle"
          copy="Keep the evidence, commercial interpretation, service opportunity, and editable pitch connected from the first click."
        />
        <HowItWorksView />
      </AnimatedSection>

      <AnimatedSection className="home-section intelligence-section">
        <div className="home-container intelligence-layout">
          <div className="intelligence-copy">
            <SectionHeading
              eyebrow="Opportunity intelligence"
              title="A finding is not automatically a sales opportunity"
              copy="ProspectAI separates what can be observed from what can reasonably be inferred, then weighs whether the result fits the services you offer."
            />
            <div className="reasoning-stack">
              <ReasoningRow
                icon={FileSearch}
                label="Observed evidence"
                text="The primary call to action is missing from key service pages."
              />
              <ReasoningRow
                icon={Lightbulb}
                label="Business interpretation"
                text="Qualified visitors may have no obvious next step after evaluating the offer."
              />
              <ReasoningRow
                icon={Target}
                label="Service opportunity"
                text="A conversion-focused redesign is relevant if it matches your capabilities."
              />
            </div>
          </div>
          <div className="score-explainer">
            <div className="score-banner">
              <Sparkles size={15} /> Higher scores. Better conversations.
            </div>
            <ScoreCard
              icon={Gauge}
              label="Website Score"
              score="62"
              copy="How the website performs against measurable quality signals."
              kind="website"
            />
            <ScoreCard
              icon={Target}
              label="Opportunity Score"
              score="87"
              copy="How commercially relevant the evidence is to your selected services."
              kind="opportunity"
            />
            <p className="score-guidance">
              <Target size={15} /> Focus on the right opportunities. Let the data do the heavy
              lifting.
            </p>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="home-section home-container extension-section">
        <div className="extension-visual" aria-hidden="true">
          <div className="browser-frame">
            <div className="browser-bar">
              <span />
              <span />
              <span />
              <div>prospect-company.com</div>
            </div>
            <div className="browser-page">
              <div className="browser-site-copy">
                <span>Product engineering</span>
                <strong>Build better software, faster.</strong>
                <p>Focused delivery for ambitious product teams.</p>
                <span className="browser-site-button" />
              </div>
              <div className="browser-copy-lines" />
              <div className="extension-popover">
                <span className="extension-popover-icon">
                  <Chrome size={23} />
                </span>
                <div>
                  <strong>Analyze this website</strong>
                  <small>Start only when you choose</small>
                </div>
                <ArrowRight size={17} />
              </div>
            </div>
          </div>
        </div>
        <div className="extension-copy">
          <span className="section-eyebrow">Built for Chrome</span>
          <h2>Analyze the business website you are already viewing</h2>
          <p>
            Start a scoped analysis from the active tab. ProspectAI does not continuously monitor
            browsing or inspect every website you visit.
          </p>
          <ul className="check-list">
            <li>
              <CheckCircle2 size={17} /> Explicit user action
            </li>
            <li>
              <CheckCircle2 size={17} /> Minimal tab access
            </li>
            <li>
              <CheckCircle2 size={17} /> Secure account pairing
            </li>
          </ul>
          <Link className="text-link" href="/app/settings/extension">
            Explore the extension workflow <ArrowRight size={16} />
          </Link>
        </div>
      </AnimatedSection>

      <AnimatedSection className="home-section audience-section">
        <div className="home-container">
          <SectionHeading
            eyebrow="Built for considered outreach"
            title="Research support for people who sell expertise"
            copy="Use the same evidence-first workflow whether you work alone, lead an agency, advise clients, or equip a focused sales team."
            centered
          />
          <div className="audience-grid">
            {audiences.map(([title, copy, Icon]) => (
              <article key={title}>
                <Icon size={22} />
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="home-section home-container pitch-section">
        <div className="pitch-copy">
          <SectionHeading
            eyebrow="Grounded pitch generation"
            title="Write from the evidence, not from a generic template"
            copy="Generated pitches stay connected to the finding, its likely business meaning, and the service opportunity. You remain in control of every edit and every send."
          />
          <div className="security-note">
            <LockKeyhole size={20} />
            <div>
              <strong>No automatic outreach in V1</strong>
              <span>
                ProspectAI creates editable drafts. It does not send messages on your behalf.
              </span>
            </div>
          </div>
        </div>
        <PitchPreview />
      </AnimatedSection>

      <AnimatedSection className="home-section pricing-section">
        <div className="home-container">
          <SectionHeading
            eyebrow="Start at your pace"
            title="A plan for the way you prospect"
            copy="Begin with the core workflow, then add capacity when evidence-backed prospecting becomes part of your routine."
            centered
          />
          <div className="home-pricing-grid">
            <PricingCard
              name="Free"
              allowance="Core workflow access"
              copy="Explore evidence-backed analysis before making it part of your routine."
              features={['Opportunity scoring', 'Editable pitch drafts', 'Saved analysis history']}
              cta="Start free"
            />
            <PricingCard
              name="Pro / Individual"
              allowance="Higher individual capacity"
              copy="For independent professionals who prospect consistently."
              features={['More website analyses', 'Lead and pitch workspace', 'Usage visibility']}
              cta="View Pro"
              featured
            />
            <PricingCard
              name="Agency"
              allowance="Shared team capacity"
              copy="For client-services teams building a repeatable research workflow."
              features={['Organization workspace', 'Shared lead context', 'Centralized billing']}
              cta="View Agency"
            />
          </div>
          <p className="pricing-disclosure">
            Current limits and billing terms are shown before checkout.
          </p>
        </div>
      </AnimatedSection>

      <AnimatedSection className="home-section home-container home-faq-section">
        <div className="faq-heading-wrap">
          <SectionHeading
            eyebrow="Questions, answered plainly"
            title="Know what ProspectAI does before you start"
            copy="Clear boundaries matter when software supports sales research and AI-assisted writing."
          />
          <Link className="text-link" href="/faq">
            View all questions <ArrowRight size={16} />
          </Link>
        </div>
        <FaqView />
      </AnimatedSection>

      <AnimatedSection className="final-cta-section">
        <div className="home-container final-cta">
          <div>
            <span className="section-eyebrow">Research with a reason</span>
            <h2>Find the opportunity before you write the outreach.</h2>
            <p>Turn public website evidence into a clearer, more credible first conversation.</p>
          </div>
          <div className="final-cta-actions">
            <Link className="home-button home-button-light" href="/signup">
              Start analyzing <ArrowRight size={18} />
            </Link>
            <Link className="final-cta-link" href="/how-it-works">
              See the workflow <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </AnimatedSection>

      <footer className="home-footer">
        <div className="home-container footer-grid">
          <div className="footer-brand">
            <span>
              <Image src="/brand-mark.png" alt="" width={30} height={30} />
              <strong>ProspectAI</strong>
            </span>
            <p>Evidence-backed prospect opportunity intelligence.</p>
          </div>
          <nav aria-label="Product links">
            <strong>Product</strong>
            <Link href="/features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/app">Workspace</Link>
          </nav>
          <nav aria-label="Resource links">
            <strong>Resources</strong>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/resources">Resources</Link>
          </nav>
          <nav aria-label="Company links">
            <strong>Company</strong>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
        <div className="home-container footer-bottom">
          <span>© 2026 ProspectAI</span>
          <span>Built for evidence-first outreach.</span>
        </div>
      </footer>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  centered?: boolean;
}) {
  return (
    <div className={`home-section-heading ${centered ? 'is-centered' : ''}`}>
      <span className="section-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

function ReasoningRow({
  icon: Icon,
  label,
  text,
}: {
  icon: typeof FileSearch;
  label: string;
  text: string;
}) {
  return (
    <div className="reasoning-row">
      <span>
        <Icon size={19} />
      </span>
      <div>
        <strong>{label}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function ScoreCard({
  icon: Icon,
  label,
  score,
  copy,
  kind,
}: {
  icon: typeof Gauge;
  label: string;
  score: string;
  copy: string;
  kind: string;
}) {
  const context = kind === 'website' ? 'Site quality signal' : 'Commercial service fit';

  return (
    <div className={`score-card-large score-card-${kind}`}>
      <div className="score-card-heading">
        <span className="score-card-icon">
          <Icon size={20} aria-hidden="true" />
        </span>
        <span>
          <strong>{label}</strong>
          <small>{context}</small>
        </span>
      </div>
      <div className="score-ring-large " style={{ '--score': score } as CSSProperties}>
        <strong>{score}</strong>
        <small>out of 100</small>
      </div>
      <p>{copy}</p>
    </div>
  );
}

function PricingCard({
  name,
  allowance,
  copy,
  features,
  cta,
  featured = false,
}: {
  name: string;
  allowance: string;
  copy: string;
  features: readonly string[];
  cta: string;
  featured?: boolean;
}) {
  return (
    <article className={`home-plan ${featured ? 'home-plan-featured' : ''}`}>
      {featured && <span className="plan-ribbon">Most popular</span>}
      <span className="plan-label">
        {featured ? 'For serious prospectors' : 'Flexible starting point'}
      </span>
      <h3>{name}</h3>
      <strong className="plan-allowance">{allowance}</strong>
      <p>{copy}</p>
      <ul>
        {features.map((feature) => (
          <li key={feature}>
            <CheckCircle2 size={15} aria-hidden="true" /> {feature}
          </li>
        ))}
      </ul>
      <Link
        className={
          featured ? 'home-button home-button-primary' : 'home-button home-button-secondary'
        }
        href="/pricing"
      >
        {cta} <ArrowRight size={16} />
      </Link>
    </article>
  );
}
