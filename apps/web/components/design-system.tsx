import { Activity, BarChart3, CheckCircle2, Target, Users, type LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({
  children,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`button ${className}`} type={type} {...props}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Score({
  value,
  kind,
}: {
  value?: number | undefined;
  kind: 'website' | 'opportunity';
}) {
  if (value === undefined)
    return (
      <div className="score score-empty">
        <span>Score</span>
        <strong>--</strong>
        <small>Available after analysis</small>
      </div>
    );
  const label =
    kind === 'website'
      ? value >= 90
        ? 'Excellent'
        : value >= 75
          ? 'Good'
          : value >= 60
            ? 'Needs improvement'
            : value >= 40
              ? 'Weak'
              : 'Significant problems'
      : value >= 85
        ? 'Very high opportunity'
        : value >= 70
          ? 'High opportunity'
          : value >= 50
            ? 'Moderate opportunity'
            : value >= 30
              ? 'Low opportunity'
              : 'Weak opportunity';
  return (
    <div className={`score score-${kind}`}>
      <span>{kind === 'website' ? 'Website score' : 'Opportunity score'}</span>
      <div className="score-value">
        <strong>{value}</strong>
        <small>/ 100</small>
      </div>
      <small>{label}</small>
      <span className="score-track" aria-hidden="true">
        <span style={{ width: `${value}%` }} />
      </span>
    </div>
  );
}

export function StatePanel({
  title,
  children,
  action,
  tone = 'default',
  icon,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  tone?: 'default' | 'success';
  icon?: ReactNode;
}) {
  return (
    <section className={`state-panel state-panel-${tone}`}>
      <span className="state-panel-icon" aria-hidden="true">
        {icon ?? <CheckCircle2 size={22} />}
      </span>
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
        {action}
      </div>
    </section>
  );
}

function metricIcon(label: string): LucideIcon {
  const normalized = label.toLowerCase();
  if (normalized.includes('lead') || normalized.includes('client')) return Users;
  if (normalized.includes('opportunit') || normalized.includes('meeting')) return Target;
  if (normalized.includes('usage') || normalized.includes('remaining')) return BarChart3;
  return Activity;
}

export function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value?: string | number;
  note: string;
}) {
  const Icon = metricIcon(label);
  return (
    <article className="metric">
      <div className="metric-heading">
        <span>{label}</span>
        <span className="metric-icon" aria-hidden="true">
          <Icon size={18} />
        </span>
      </div>
      <strong>{value ?? '--'}</strong>
      <small>{note}</small>
    </article>
  );
}
