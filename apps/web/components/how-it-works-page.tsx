import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Chrome,
  FileSearch,
  FileText,
  Globe2,
  Lightbulb,
  PenLine,
  ScanSearch,
  Sparkles,
  Target,
  UserRoundPlus,
} from 'lucide-react';
import { AnimatedSection } from './animated-section';
import { prospectWorkflow } from './marketing-views';

const stepIcons = [
  Globe2,
  ScanSearch,
  FileSearch,
  Target,
  BriefcaseBusiness,
  PenLine,
  UserRoundPlus,
];

export function HowItWorksPage() {
  return (
    <main className="how-page">
      <section className="how-hero" aria-labelledby="how-title">
        <div className="how-grid-texture" aria-hidden="true" />
        <div className="how-container how-hero-layout">
          <div className="how-copy">
            <span className="how-eyebrow how-enter how-enter-1">ProspectAI</span>
            <h1 className="how-enter how-enter-2" id="how-title">
              A focused path from <span>prospect to pitch</span>
            </h1>
            <p className="how-audience how-enter how-enter-3">
              Built for freelancers, agencies, consultants, and small sales teams.
            </p>
            <div className="how-introduction how-enter how-enter-4">
              <h2>From a live website to a qualified lead</h2>
              <p>
                ProspectAI turns public website evidence into a relevant service recommendation and
                editable pitch, without confusing an audit finding with a buying signal.
              </p>
            </div>
          </div>
          <div className="how-preview-wrap how-enter how-enter-preview">
            <span className="how-note how-note-left" aria-hidden="true">
              Real websites. Relevant opportunities.
            </span>
            <WorkflowProductPreview />
            <span className="how-note how-note-right" aria-hidden="true">
              Less research. More context.
            </span>
          </div>
        </div>

        <AnimatedSection className="how-container how-timeline-wrap is-visible">
          <div className="timeline-heading">
            <span>The prospect-to-pitch workflow</span>
            <strong>Seven connected decisions, grounded in evidence</strong>
          </div>
          <WorkflowTimeline />
        </AnimatedSection>
      </section>

      <AnimatedSection className="how-principles">
        <div className="how-container">
          <div className="how-section-heading">
            <span>From insights to impact</span>
            <h2>Each step protects the quality of the next</h2>
            <p>
              ProspectAI keeps facts, reasoned interpretation, and commercial relevance distinct so
              your outreach has a credible foundation.
            </p>
          </div>
          <div className="principle-grid">
            <Principle
              icon={FileSearch}
              title="Evidence stays factual"
              copy="Findings identify what was observed, where it appeared, and how confident the analysis is."
            />
            <Principle
              icon={Lightbulb}
              title="Meaning stays reasoned"
              copy="Interpretation explains likely business impact without presenting inference as certainty."
            />
            <Principle
              icon={Target}
              title="Opportunity stays relevant"
              copy="Service recommendations depend on commercial relevance and the services you actually offer."
            />
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="how-final-cta">
        <div className="how-container how-final-inner">
          <div>
            <span>Start with the website in front of you</span>
            <h2>Turn evidence into a better first conversation.</h2>
          </div>
          <Link className="home-button home-button-primary" href="/signup">
            Start analyzing <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </AnimatedSection>
    </main>
  );
}

export function WorkflowTimeline() {
  return (
    <div className="how-timeline" role="list" aria-label="Prospect-to-pitch workflow">
      {prospectWorkflow.map(([title, copy], index) => {
        const Icon = stepIcons[index] ?? Sparkles;
        return <WorkflowStepCard copy={copy} icon={Icon} index={index} key={title} title={title} />;
      })}
    </div>
  );
}

function WorkflowStepCard({
  copy,
  icon: Icon,
  index,
  title,
}: {
  copy: string;
  icon: typeof Globe2;
  index: number;
  title: string;
}) {
  return (
    <div className="how-step" role="listitem" style={{ '--step-index': index } as CSSProperties}>
      <span className="how-step-number" aria-hidden="true">
        {index + 1}
      </span>
      <article tabIndex={0} aria-label={`Step ${index + 1}: ${title}`}>
        <span className="how-step-icon">
          <Icon size={24} aria-hidden="true" />
        </span>
        <h3>{title}</h3>
        <p>{copy}</p>
      </article>
    </div>
  );
}

function WorkflowProductPreview() {
  return (
    <div className="how-product-preview" aria-label="Illustrative ProspectAI opportunity view">
      <div className="how-preview-header">
        <span>
          <Image src="/brand-mark.png" width={26} height={26} alt="" priority /> ProspectAI
        </span>
        <small>Illustrative example</small>
      </div>
      <div className="how-preview-body">
        <aside aria-label="Product preview navigation">
          <span className="is-active">
            <ScanSearch size={15} /> Discover
          </span>
          <span>
            <Target size={15} /> Opportunities
          </span>
          <span>
            <UserRoundPlus size={15} /> Saved leads
          </span>
          <span>
            <PenLine size={15} /> Pitches
          </span>
          <span className="how-preview-origin">
            <Chrome size={15} /> Chrome Extension
          </span>
        </aside>
        <div className="how-preview-content">
          <div className="opportunity-found">
            <div className="opportunity-found-heading">
              <span>New opportunity found</span>
              <small>
                <CheckCircle2 size={12} /> Website analyzed
              </small>
            </div>
            <div className="opportunity-company">
              <span className="company-scan-icon">
                <ScanSearch size={20} />
              </span>
              <div>
                <strong>example.com</strong>
                <small>Business services</small>
              </div>
              <span className="opportunity-strength">Strong opportunity</span>
            </div>
          </div>
          <div className="recommended-services">
            <span>Recommended services</span>
            <div>
              <small>Conversion strategy</small>
              <small>Content structure</small>
              <small>Website redesign</small>
            </div>
          </div>
          <div className="preview-reason">
            <FileText size={15} />
            <span>Recommendation linked to 3 observable findings</span>
          </div>
          <div className="generate-pitch-preview">
            Generate editable pitch <Sparkles size={15} />
          </div>
        </div>
      </div>
      <div className="impact-chip" aria-hidden="true">
        <BarChart3 size={21} />
        <span>Turn website context into a credible opening</span>
      </div>
    </div>
  );
}

function Principle({
  copy,
  icon: Icon,
  title,
}: {
  copy: string;
  icon: typeof FileSearch;
  title: string;
}) {
  return (
    <article>
      <Icon size={22} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}
