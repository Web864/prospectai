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
  Github,
  Lightbulb,
  Linkedin,
  Megaphone,
  MousePointer2,
  Rocket,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Youtube,
} from 'lucide-react';
import { AnimatedSection } from './animated-section';
import { FaqView, HowItWorksView } from './marketing-views';
import { PitchPreview } from './pitch-preview';
import { ProductPreview } from './product-preview';

const values = [
  [
    'Evidence',
    'We analyze real website data, public signals and market context.',
    ScanSearch,
    'blue',
  ],
  [
    'Interpretation',
    'Our AI turns insights into clear opportunity and recommendations.',
    Lightbulb,
    'violet',
  ],
  [
    'Opportunity',
    'You get a ranked list of what to sell and how to frame it.',
    Rocket,
    'green',
  ],
] as const;

const audiences = [
  ['Freelancers', 'Find clients with real needs and craft personalized outreach.', BriefcaseBusiness],
  ['Agencies', 'Spot new business opportunities and expand your pipeline.', Building2],
  ['Consultants', 'Discover companies ready for your expertise.', Users],
  ['Small Sales Teams', 'Do more with less. Find and reach out to high-intent prospects.', Megaphone],
] as const;

export function Homepage() {
  return (
    <main className="homepage">
      <section className="home-hero" aria-labelledby="home-title">
        <HeroAtmosphere />
        <div className="home-container hero-stage">
          <div className="hero-copy">
            <span className="hero-eyebrow hero-enter hero-enter-1">
              <Sparkles size={14} /> AI powered opportunity intelligence
            </span>
            <h1 className="hero-enter hero-enter-2" id="home-title">
              Know <span>what service to sell</span> before you write the first message.
            </h1>
            <p className="hero-lede hero-enter hero-enter-3">
              ProspectAI analyzes company websites, detects what they need, researches the
              opportunity and helps you write outreach grounded in real evidence. Less guessing.
              More conversations.
            </p>
            <div className="hero-actions hero-enter hero-enter-4">
              <Link className="home-button home-button-primary" href="/signup">
                Start analyzing <ArrowRight size={17} />
              </Link>
              <Link className="home-button home-button-secondary" href="/how-it-works">
                <MousePointer2 size={17} /> See how it works
              </Link>
            </div>
            <ul className="hero-trust hero-enter hero-enter-4" aria-label="Product highlights">
              <li>
                <Chrome size={14} /> Save hours of research
              </li>
              <li>
                <ShieldCheck size={14} /> Backed by real web data
              </li>
              <li>
                <CheckCircle2 size={14} /> Trusted by builders
              </li>
            </ul>
          </div>

          <div className="hero-product hero-enter hero-enter-product">
            <span className="hero-note hero-note-top" aria-hidden="true">
              From website<br />to pipeline
              <svg viewBox="0 0 74 34" aria-hidden="true">
                <defs>
                  <filter id="note-shadow" x="-40%" y="-40%" width="180%" height="180%">
                    <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity=".18" />
                  </filter>
                </defs>
                <path d="M4 5c24-4 42 2 59 20" filter="url(#note-shadow)" />
                <path d="m58 18 7 8-11 1" />
              </svg>
            </span>
            <ProductPreview />
            <div className="pipeline-chip" aria-hidden="true">
              <span className="pipeline-bars">
                <i />
                <i />
                <i />
              </span>
              <strong>Turn website data<br />into pipeline</strong>
            </div>
          </div>
        </div>
      </section>

      <AnimatedSection className="home-container value-band is-visible">
        <p className="value-caption">Every great conversation starts with insight.</p>
        <div className="value-grid">
          {values.map(([title, copy, Icon, tone]) => (
            <article className="value-card" key={title}>
              <span className={`home-icon home-icon-${tone}`}>
                <Icon size={21} />
              </span>
              <div>
                <h2>{title}</h2>
                <p>{copy}</p>
              </div>
              <ArrowRight className="card-arrow" size={17} />
            </article>
          ))}
        </div>
      </AnimatedSection>

      <AnimatedSection className="home-section home-container workflow-section">
        <SectionHeading
          eyebrow="Faster, smarter workflow"
          title="Move from browsing to a credible sales angle"
          copy="Go from a website, to evidence, to a compelling outreach message. ProspectAI streamlines the research and messaging process so you can focus on what matters — starting conversations."
        />
        <span className="workflow-note" aria-hidden="true">
          From research<br />to results
          <svg viewBox="0 0 130 70">
            <defs>
              <filter id="workflow-note-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity=".18" />
              </filter>
            </defs>
            <path d="M117 4c3 23-13 41-35 45-23 5-39 4-60 15" filter="url(#workflow-note-shadow)" />
            <path d="m24 57-9 8 11 3" />
          </svg>
        </span>
        <HowItWorksView />
      </AnimatedSection>

      <AnimatedSection className="home-section intelligence-section">
        <div className="home-container intelligence-layout">
          <div className="intelligence-copy">
            <SectionHeading
              eyebrow="Opportunity intelligence"
              title="A finding is not automatically a sales opportunity"
              copy="ProspectAI separates noise from real opportunity. Our scoring model helps you focus on the companies most likely to buy your services, so you can prioritize with confidence."
            />
            <div className="reasoning-stack">
              <ReasoningRow
                icon={FileSearch}
                label="Data-backed analysis"
                text="Interprets website content, tech stack and market signals."
              />
              <ReasoningRow
                icon={Target}
                label="Clear opportunity scoring"
                text="See which companies are ready, and what to sell."
              />
              <ReasoningRow
                icon={Lightbulb}
                label="Actionable recommendations"
                text="Get specific service suggestions with real evidence."
              />
            </div>
          </div>
          <div className="score-explainer">
            <div className="score-banner">
              <Sparkles size={14} /> Higher scores. Better conversations.
            </div>
            <ScoreCard
              icon={Gauge}
              label="Website Score"
              score="62"
              copy="The website is functional but missing key pages, recent content and social proof."
              kind="website"
            />
            <ScoreCard
              icon={Target}
              label="Opportunity Score"
              score="87"
              copy="Strong signals of need, growth and budget. A high-value opportunity for your services."
              kind="opportunity"
            />
            <p className="score-guidance">
              <Target size={14} /> Focus on the right opportunities. Let the data do the heavy
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
              <div>https://example.com</div>
            </div>
            <div className="browser-page">
              <div className="browser-site-copy">
                <span>PRODUCT ENGINEERING</span>
                <strong>Build better<br />software, faster.</strong>
                <p>Focused delivery for ambitious product teams.</p>
                <span className="browser-site-button" />
              </div>
              <svg className="browser-illustration" viewBox="0 0 220 180">
                <defs>
                  <filter id="browser-svg-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#0c786f" floodOpacity=".12" />
                  </filter>
                </defs>
                <path d="M40 150C68 66 124 22 192 54c-5 60-48 111-112 115-21 2-33-5-40-19Z" filter="url(#browser-svg-shadow)" />
              </svg>
              <div className="extension-popover">
                <span className="extension-popover-icon">
                  <Chrome size={20} />
                </span>
                <div>
                  <strong>Analyze this website</strong>
                  <small>Uncover opportunities in seconds</small>
                </div>
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </div>
        <div className="extension-copy">
          <span className="section-eyebrow">Website analysis</span>
          <h2>Analyze the business website you are already viewing</h2>
          <p>
            Run a deep analysis from any website. ProspectAI scans key pages, detects what&apos;s
            missing and surfaces opportunities you can turn into tailored outreach.
          </p>
          <ul className="check-list">
            <li>
              <CheckCircle2 size={16} /> Works with any website
            </li>
            <li>
              <CheckCircle2 size={16} /> Detects gaps and risks
            </li>
            <li>
              <CheckCircle2 size={16} /> Finds relevant services to sell
            </li>
          </ul>
          <Link className="text-link" href="/app/settings/extension">
            Explore the website analysis <ArrowRight size={15} />
          </Link>
        </div>
      </AnimatedSection>

      <AnimatedSection className="home-section audience-section">
        <div className="home-container">
          <SectionHeading
            eyebrow="Built for people who create impact"
            title="Research support for people who sell expertise"
            copy="Use the same intelligence as top performers to find opportunities, tailor your messaging, and win more business — across any industry."
            centered
          />
          <div className="audience-grid">
            {audiences.map(([title, copy, Icon]) => (
              <article key={title}>
                <span className="audience-icon"><Icon size={19} /></span>
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
            eyebrow="AI-powered pitch generation"
            title="Write from the evidence, not from a generic template"
            copy="Generate high-quality outreach based on real findings. Our AI creates personalized, credible messages that reference what matters — so you can start conversations with confidence."
          />
          <div className="security-note">
            <Sparkles size={19} />
            <div>
              <strong>No more blank pages</strong>
              <span>Turn insights into outreach in seconds.</span>
            </div>
          </div>
        </div>
        <PitchPreview />
      </AnimatedSection>

      <AnimatedSection className="home-section pricing-section">
        <div className="home-container">
          <SectionHeading
            eyebrow="Plan for your pace"
            title="A plan for the way you prospect"
            copy="From your first few conversations to a full outbound engine, there&apos;s a plan to fit your goals."
          />
          <div className="home-pricing-grid">
            <PricingCard
              name="Free"
              descriptor="Get started"
              copy="Explore core features and analyze a few websites per month."
              features={['3 website analyses / month', 'Basic AI insights']}
              cta="Start free"
              icon="user"
            />
            <PricingCard
              name="Pro / Individual"
              descriptor="For serious prospectors"
              copy="More analyses, full features and pitch generation."
              features={['100 website analyses / month', 'Opportunity scoring', 'AI pitch generation']}
              cta="Start Pro"
              icon="team"
              featured
            />
            <PricingCard
              name="Agency"
              descriptor="Built for teams"
              copy="Advanced usage limits, team collaboration and priority support."
              features={['Everything in Pro', 'Team seats', 'Priority support']}
              cta="Contact sales"
              icon="building"
            />
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="home-section home-container home-faq-section">
        <div className="faq-heading-wrap">
          <SectionHeading
            eyebrow="Questions? We have answers"
            title="Know what ProspectAI does before you start"
            copy="Clear answers to help you get the most out of ProspectAI."
          />
        </div>
        <FaqView />
      </AnimatedSection>

      <AnimatedSection className="final-cta-section">
        <FinalCtaAtmosphere />
        <div className="home-container final-cta">
          <div>
            <span className="section-eyebrow">Ready to find your next client?</span>
            <h2>Find the opportunity<br />before you write the outreach.</h2>
            <p>Turn website data into real conversations. Start analyzing today.</p>
          </div>
          <div className="final-cta-visual" aria-hidden="true">
            <span className="cta-bars"><i /><i /><i /></span>
          </div>
          <div className="final-cta-actions">
            <Link className="home-button home-button-light" href="/signup">
              Start analyzing <ArrowRight size={17} />
            </Link>
            <small>No credit card required</small>
          </div>
        </div>
      </AnimatedSection>

      <footer className="home-footer">
        <div className="home-container footer-grid">
          <div className="footer-brand">
            <span>
              <Image src="/brand-mark.png" alt="" width={28} height={28} />
              <strong>ProspectAI</strong>
            </span>
            <p>Real websites. Real insights. Real opportunities.</p>
            <div className="footer-socials" aria-label="Social links">
              <span aria-hidden="true">X</span>
              <Linkedin size={14} aria-hidden="true" />
              <Youtube size={15} aria-hidden="true" />
              <Github size={14} aria-hidden="true" />
            </div>
            <small>© 2026 ProspectAI. All rights reserved.</small>
          </div>
          <nav aria-label="Product links">
            <strong>Product</strong>
            <Link href="/features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/how-it-works">Use Cases</Link>
            <Link href="/resources">Changelog</Link>
          </nav>
          <nav aria-label="Resource links">
            <strong>Resources</strong>
            <Link href="/resources">Blog</Link>
            <Link href="/faq">Help Center</Link>
            <Link href="/resources">Guides</Link>
            <Link href="/resources">API / Coming soon</Link>
          </nav>
          <nav aria-label="Company links">
            <strong>Company</strong>
            <Link href="/contact">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
        <div className="home-container footer-bottom">
          <span />
          <span>Built for the people who build business.</span>
        </div>
      </footer>
    </main>
  );
}

function HeroAtmosphere() {
  return (
    <svg className="hero-atmosphere" viewBox="0 0 1600 760" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="hero-wave-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9fbf5" stopOpacity=".04" />
          <stop offset="1" stopColor="#0eaa9b" stopOpacity=".34" />
        </linearGradient>
        <linearGradient id="hero-wave-b" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#d6e9ff" stopOpacity=".04" />
          <stop offset="1" stopColor="#4ad3c2" stopOpacity=".42" />
        </linearGradient>
        <filter id="hero-wave-shadow" x="-20%" y="-30%" width="150%" height="170%">
          <feDropShadow dx="0" dy="22" stdDeviation="28" floodColor="#0d8278" floodOpacity=".15" />
        </filter>
      </defs>
      <path d="M1040-20c204 8 376 91 520 246 41 44 61 101 65 173-170-121-343-128-514-20-125 79-218 169-351 127 59-111 144-203 280-276 91-49 117-154 0-250Z" fill="url(#hero-wave-a)" filter="url(#hero-wave-shadow)" />
      <path d="M1031 98c176 30 322 115 437 252 48 57 89 126 129 211-140-56-278-57-420 4-112 49-202 103-335 70 48-102 122-184 228-246 96-56 137-147  -39-291Z" fill="url(#hero-wave-b)" opacity=".86" />
      <path d="M-50 542c151 22 264 70 358 150 63 53 142 72 236 57C401 834 217 866-36 844Z" fill="#c9f5ef" opacity=".5" />
    </svg>
  );
}

function FinalCtaAtmosphere() {
  return (
    <svg className="final-cta-atmosphere" viewBox="0 0 1600 310" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="cta-wave" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#0d5c5c" />
          <stop offset=".5" stopColor="#0a7f76" />
          <stop offset="1" stopColor="#04565a" />
        </linearGradient>
        <filter id="cta-svg-shadow" x="-20%" y="-40%" width="140%" height="190%">
          <feDropShadow dx="0" dy="16" stdDeviation="14" floodColor="#001f25" floodOpacity=".28" />
        </filter>
      </defs>
      <path d="M0 210c180-55 280-35 408 22 148 67 278-112 408-82 128 30 207 122 340 70 132-52 225-77 444 1v89H0Z" fill="url(#cta-wave)" opacity=".78" filter="url(#cta-svg-shadow)" />
      <path d="M430 290c180-130 278-130 385-15 80 86 147 54 224-33 91-103 166-72 251 29 67 80 157 68 310-8v47H430Z" fill="#0a6d68" opacity=".54" />
    </svg>
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
        <Icon size={17} />
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
  const context = kind === 'website' ? 'Overall website maturity' : 'Likelihood to buy your services';

  return (
    <div className={`score-card-large score-card-${kind}`}>
      <div className="score-card-heading">
        <span className="score-card-icon">
          <Icon size={18} aria-hidden="true" />
        </span>
        <span>
          <strong>{label}</strong>
          <small>{context}</small>
        </span>
      </div>
      <div className="score-ring-large" style={{ '--score': score } as CSSProperties}>
        <strong>{score}</strong>
        <small>/100</small>
      </div>
      <p>{copy}</p>
    </div>
  );
}

function PricingCard({
  name,
  descriptor,
  copy,
  features,
  cta,
  icon,
  featured = false,
}: {
  name: string;
  descriptor: string;
  copy: string;
  features: readonly string[];
  cta: string;
  icon: 'user' | 'team' | 'building';
  featured?: boolean;
}) {
  const Icon = icon === 'building' ? Building2 : icon === 'team' ? Users : Users;

  return (
    <article className={`home-plan ${featured ? 'home-plan-featured' : ''}`}>
      {featured && <span className="plan-ribbon">Most popular</span>}
      <div className="plan-title-row">
        <span className="plan-icon"><Icon size={18} /></span>
        <div>
          <h3>{name}</h3>
          <strong className="plan-descriptor">{descriptor}</strong>
        </div>
      </div>
      <p>{copy}</p>
      <ul>
        {features.map((feature) => (
          <li key={feature}>
            <CheckCircle2 size={14} aria-hidden="true" /> {feature}
          </li>
        ))}
      </ul>
      <Link
        className={featured ? 'home-button home-button-primary' : 'home-button home-button-secondary'}
        href={name === 'Agency' ? '/contact' : '/signup'}
      >
        {cta} {featured && <ArrowRight size={15} />}
      </Link>
    </article>
  );
}
