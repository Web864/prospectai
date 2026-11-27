'use client';

import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Copy,
  FileSearch,
  Gauge,
  Globe2,
  Info,
  Layers3,
  Megaphone,
  MousePointer2,
  PenLine,
  ScanSearch,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundPlus,
} from 'lucide-react';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import '../app/how-it-works-story.css';

type Step = { title: string; kicker: string; copy: string; icon: LucideIcon };

const steps: Step[] = [
  {
    title: 'Enter a website',
    kicker: 'One domain, one click',
    copy: 'Paste a company domain in the dashboard or open the site and use the Chrome extension.',
    icon: Globe2,
  },
  {
    title: 'AI research',
    kicker: 'A secure, polite crawl',
    copy: 'ProspectAI reads the public pages, technology, content and trust signals, and records where each one was seen.',
    icon: ScanSearch,
  },
  {
    title: 'Detect needs',
    kicker: 'Findings, not guesses',
    copy: 'Gaps are listed with severity and evidence, so an audit finding never masquerades as a buying signal.',
    icon: FileSearch,
  },
  {
    title: 'Match the opportunity',
    kicker: 'Only services you offer',
    copy: 'Findings connect to the services in your profile, ranked by commercial relevance.',
    icon: Target,
  },
  {
    title: 'Review insights',
    kicker: 'Transparent scoring',
    copy: 'See the opportunity score, the evidence behind it and the reasoning, then decide if it is worth your time.',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Generate the pitch',
    kicker: 'Grounded outreach',
    copy: 'An editable first message cites what was actually observed on their site.',
    icon: PenLine,
  },
  {
    title: 'Go to market',
    kicker: 'Save, copy, send',
    copy: 'Save the lead, copy the pitch and reach out with context instead of a cold template.',
    icon: UserRoundPlus,
  },
];

/**
 * Scroll-driven walkthrough: the step text scrolls normally while a sticky stage plays the
 * animated scene for whichever step is in the middle of the viewport. Scenes are pure CSS and
 * restart when their step becomes active. Decorative (the stage is aria-hidden); the step text
 * carries the meaning. Without JavaScript the first scene shows; with reduced motion every scene
 * renders its final state.
 */
export function HowItWorksStory() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.step);
          if (!Number.isNaN(index)) setActive(index);
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    for (const node of refs.current) if (node) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const progress = (active + 1) / steps.length;

  return (
    <section className="hs" aria-labelledby="hs-title">
      <div className="how-container">
        <div className="how-section-heading hs-heading">
          <span>Watch it work</span>
          <h2 id="hs-title">A website becomes a pitch in seven moves</h2>
          <p>Scroll through one example, from a domain to a message you would be proud to send.</p>
        </div>
        <div className="hs-layout">
          <ol className="hs-steps">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  ref={(node) => {
                    refs.current[index] = node;
                  }}
                  data-step={index}
                  className={`hs-step${index === active ? ' is-active' : ''}${index < active ? ' is-done' : ''}`}
                >
                  <span className="hs-step-index" aria-hidden="true">
                    {index < active ? <Check size={16} /> : <Icon size={18} />}
                  </span>
                  <div>
                    <small>
                      Step {index + 1} · {step.kicker}
                    </small>
                    <h3>{step.title}</h3>
                    <p>{step.copy}</p>
                    <div className="hs-inline-stage" aria-hidden="true">
                      {index === active ? (
                        <Scene index={index} key="playing" />
                      ) : (
                        <Scene index={index} still key="still" />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="hs-stage-wrap" aria-hidden="true">
            <div className="hs-stage" style={{ '--hs-progress': progress } as CSSProperties}>
              <div className="hs-stage-bar">
                <i />
                <i />
                <i />
                <span>
                  Step {active + 1} of {steps.length} · Illustrative example
                </span>
                <b className="hs-progress">
                  <em />
                </b>
              </div>
              <div className="hs-scene-frame">
                <Scene index={active} key={active} />
              </div>
              <div className="hs-dots">
                {steps.map((step, index) => (
                  <span key={step.title} className={index <= active ? 'is-on' : undefined} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const scenes = [
  SceneEnter,
  SceneResearch,
  SceneDetect,
  SceneMatch,
  SceneReview,
  ScenePitch,
  SceneLaunch,
];

/** `still` renders the scene's finished state with no animation (used for inactive steps). */
function Scene({ index, still = false }: { index: number; still?: boolean }) {
  const Body = scenes[index] ?? SceneLaunch;
  return (
    <div className={`hs-scene-host${still ? ' is-still' : ''}`}>
      <Body />
    </div>
  );
}

function SceneEnter() {
  return (
    <div className="hs-scene hs-enter">
      <div className="hs-input">
        <Globe2 size={18} />
        <span className="hs-typed">northwind-dental.com</span>
        <span className="hs-caret" />
      </div>
      <div className="hs-analyze">
        Analyze website <ArrowRight size={16} />
        <span className="hs-ripple" />
      </div>
      <MousePointer2 className="hs-pointer" size={26} />
      <div className="hs-or">
        <span>or from any tab</span>
        <b>
          <Sparkles size={14} /> Chrome extension
        </b>
      </div>
    </div>
  );
}

function SceneResearch() {
  const signals = [
    ['Pages read', Layers3],
    ['Tech stack', Gauge],
    ['Trust signals', ShieldCheck],
    ['Market cues', Megaphone],
  ] as const;
  return (
    <div className="hs-scene hs-research">
      <div className="hs-site">
        <i className="hs-site-hero" />
        <i />
        <i />
        <i className="hs-short" />
        <div className="hs-site-cols">
          <i />
          <i />
          <i />
        </div>
        <span className="hs-beam" />
      </div>
      <div className="hs-signals">
        {signals.map(([label, Icon], i) => (
          <span key={label} style={{ '--i': i } as CSSProperties}>
            <Icon size={15} /> {label}
          </span>
        ))}
      </div>
      <svg className="hs-ring" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" />
        <circle className="hs-ring-fill" cx="22" cy="22" r="18" />
      </svg>
    </div>
  );
}

function SceneDetect() {
  const findings = [
    ['No clear call to action above the fold', 'warn', AlertTriangle],
    ['Mobile page takes 6.1s to load', 'warn', AlertTriangle],
    ['Footer copyright last updated 2021', 'info', Info],
    ['Valid HTTPS certificate', 'ok', CheckCircle2],
  ] as const;
  return (
    <div className="hs-scene hs-detect">
      {findings.map(([label, tone, Icon], i) => (
        <div key={label} className={`hs-finding is-${tone}`} style={{ '--i': i } as CSSProperties}>
          <Icon size={16} />
          <span>{label}</span>
          <small>{tone === 'ok' ? 'Pass' : tone === 'warn' ? 'High' : 'Low'}</small>
        </div>
      ))}
    </div>
  );
}

function SceneMatch() {
  return (
    <div className="hs-scene hs-match">
      <div className="hs-col">
        <span className="hs-pill is-warn">Weak call to action</span>
        <span className="hs-pill is-warn">Slow mobile load</span>
        <span className="hs-pill is-info">Stale content</span>
      </div>
      <svg className="hs-links" viewBox="0 0 120 180" preserveAspectRatio="none">
        <path d="M0 30 C 60 30, 60 50, 120 50" />
        <path d="M0 90 C 60 90, 60 130, 120 130" />
        <path d="M0 150 C 60 150, 60 60, 120 50" />
      </svg>
      <div className="hs-col">
        <span className="hs-service">
          <Target size={15} /> Conversion strategy
        </span>
        <span className="hs-service">
          <Gauge size={15} /> Performance tune-up
        </span>
      </div>
    </div>
  );
}

function SceneReview() {
  const bars = [
    ['Evidence strength', 88],
    ['Commercial relevance', 82],
    ['Fit with your services', 91],
  ] as const;
  return (
    <div className="hs-scene hs-review">
      <div className="hs-gauge">
        <svg viewBox="0 0 120 70">
          <path d="M10 64 A 50 50 0 0 1 110 64" />
          <path className="hs-gauge-fill" d="M10 64 A 50 50 0 0 1 110 64" />
        </svg>
        <strong>86</strong>
        <small>Opportunity score</small>
      </div>
      <div className="hs-bars">
        {bars.map(([label, value], i) => (
          <div key={label} style={{ '--i': i, '--v': `${value}%` } as CSSProperties}>
            <span>{label}</span>
            <b>
              <em />
            </b>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScenePitch() {
  return (
    <div className="hs-scene hs-pitch">
      <div className="hs-mail">
        <div className="hs-mail-head">
          <PenLine size={15} /> Draft for Northwind Dental
          <span>
            <Sparkles size={13} /> Grounded
          </span>
        </div>
        <p className="hs-line" style={{ '--i': 0 } as CSSProperties}>
          Hi Dr. Patel, I was looking at northwind-dental.com on my phone.
        </p>
        <p className="hs-line" style={{ '--i': 1 } as CSSProperties}>
          It took about <mark>6 seconds to load</mark>, and the booking button sits below the fold.
        </p>
        <p className="hs-line" style={{ '--i': 2 } as CSSProperties}>
          Two small changes could make booking much easier. Worth a quick chat?
        </p>
        <div className="hs-cite">
          <FileSearch size={13} /> Cites 2 observed findings
        </div>
      </div>
    </div>
  );
}

function SceneLaunch() {
  return (
    <div className="hs-scene hs-launch">
      <div className="hs-lead-card">
        <span className="hs-avatar">ND</span>
        <div>
          <strong>Northwind Dental</strong>
          <small>Score 86 · Conversion strategy</small>
        </div>
        <span className="hs-saved">
          <Check size={13} /> Saved
        </span>
      </div>
      <div className="hs-actions">
        <span className="hs-act is-copy">
          <Copy size={15} /> Copied
        </span>
        <span className="hs-act is-send">
          <Send size={15} /> Ready to send
        </span>
      </div>
      <span className="hs-plane">
        <Send size={22} />
      </span>
      <span className="hs-confetti" />
    </div>
  );
}
