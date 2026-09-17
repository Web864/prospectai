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
    <div className="score">
      <span>{kind === 'website' ? 'Website score' : 'Opportunity score'}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

export function StatePanel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="state-panel">
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </section>
  );
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
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value ?? '--'}</strong>
      <small>{note}</small>
    </article>
  );
}
