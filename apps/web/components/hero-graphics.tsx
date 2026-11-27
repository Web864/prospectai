import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Check,
  CircleHelp,
  Globe2,
  Mail,
  MessageSquareText,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import '../app/hero-graphics.css';

/**
 * Animated hero graphics for the Features, Pricing and FAQ pages. Pure HTML, SVG and CSS:
 * no JavaScript, no images and nothing to load. Decorative (aria-hidden), themed through the
 * shared tokens, and static under prefers-reduced-motion.
 */

function Orbits() {
  return (
    <svg className="hg-orbits" viewBox="0 0 520 320" aria-hidden="true">
      <defs>
        <linearGradient id="hg-line" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <ellipse className="hg-ring hg-ring-1" cx="300" cy="160" rx="230" ry="128" />
      <ellipse className="hg-ring hg-ring-2" cx="300" cy="160" rx="168" ry="92" />
      <ellipse className="hg-ring hg-ring-3" cx="300" cy="160" rx="104" ry="56" />
    </svg>
  );
}

function Chip({ icon: Icon, className }: { icon: LucideIcon; className: string }) {
  return (
    <span className={`hg-chip ${className}`}>
      <Icon size={20} />
    </span>
  );
}

/** Features: a website panel is scanned; each finding lights up in turn and flows to an outcome. */
export function FeaturesHeroGraphic() {
  const findings = [
    ['Pricing page detected', BarChart3],
    ['Core service understood', Search],
    ['Company profile matched', Target],
  ] as const;
  return (
    <div className="reference-visual hg hg-features" aria-hidden="true">
      <Orbits />
      <div className="hg-panel">
        <div className="hg-panel-bar">
          <i />
          <i />
          <i />
          <span className="hg-url">
            <Globe2 size={12} /> example-business.com
          </span>
        </div>
        <div className="hg-scan" />
        {findings.map(([label, Icon], index) => (
          <div className="hg-row" style={{ ['--i' as string]: index }} key={label}>
            <span className="hg-row-icon">
              <Icon size={14} />
            </span>
            <strong>{label}</strong>
            <span className="hg-row-check">
              <Check size={14} />
            </span>
          </div>
        ))}
        <div className="hg-meter">
          <span>Opportunity</span>
          <div>
            <i />
          </div>
          <b>86</b>
        </div>
      </div>
      <Chip icon={Mail} className="hg-chip-a" />
      <Chip icon={Target} className="hg-chip-b" />
      <Chip icon={TrendingUp} className="hg-chip-c" />
      <span className="hg-spark hg-spark-1" />
      <span className="hg-spark hg-spark-2" />
      <span className="hg-spark hg-spark-3" />
    </div>
  );
}

/** Pricing: three plan nodes orbit a glowing core; bars show the monthly allowance per plan. */
export function PricingHeroGraphic({ plans }: { plans: { name: string; analyses: number }[] }) {
  const max = Math.max(...plans.map((plan) => plan.analyses), 1);
  return (
    <div className="reference-visual hg hg-pricing" aria-hidden="true">
      <Orbits />
      <div className="hg-core">
        <Zap size={26} />
        <small>analyses / month</small>
      </div>
      {plans.map((plan, index) => (
        <span className={`hg-node hg-node-${index + 1}`} key={plan.name}>
          <b>{plan.analyses}</b>
          <small>{plan.name.split(' ')[0]}</small>
        </span>
      ))}
      <div className="hg-bars">
        {plans.map((plan, index) => (
          <div className="hg-bar" key={plan.name} style={{ ['--i' as string]: index }}>
            <i
              style={{
                ['--h' as string]: `${Math.round(Math.max(10, (Math.log10(plan.analyses + 1) / Math.log10(max + 1)) * 62))}px`,
              }}
            />
            <small>{plan.name.split(' ')[0]}</small>
          </div>
        ))}
      </div>
      <span className="hg-spark hg-spark-1" />
      <span className="hg-spark hg-spark-2" />
    </div>
  );
}

/** FAQ: a question arrives, the assistant "types", and a grounded answer with a source appears. */
export function FaqHeroGraphic() {
  return (
    <div className="reference-visual hg hg-faq" aria-hidden="true">
      <Orbits />
      <div className="hg-chat">
        <div className="hg-bubble hg-q">
          <CircleHelp size={15} /> How is the score calculated?
        </div>
        <div className="hg-bubble hg-typing">
          <i />
          <i />
          <i />
        </div>
        <div className="hg-bubble hg-a">
          <Sparkles size={15} />
          <span>
            From observable website signals and commercial relevance, by transparent rules.
            <em>Source: FAQ</em>
          </span>
        </div>
      </div>
      <Chip icon={MessageSquareText} className="hg-chip-a" />
      <Chip icon={CircleHelp} className="hg-chip-b" />
      <span className="hg-spark hg-spark-1" />
      <span className="hg-spark hg-spark-3" />
    </div>
  );
}
