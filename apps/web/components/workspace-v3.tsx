import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function V3Stat({
  title,
  value,
  note,
  icon: Icon,
  visual,
}: {
  title: string;
  value: ReactNode;
  note: string;
  icon: LucideIcon;
  visual?: ReactNode;
}) {
  return (
    <article className="v3-stat">
      <div className="v3-stathead">
        <span>{title}</span>
        <span className="v3-emblem" aria-hidden="true">
          <Icon size={17} />
        </span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
      {visual && <div className="v3-stat-visual">{visual}</div>}
    </article>
  );
}

export function V3Panel({
  children,
  padded = false,
  className = '',
}: {
  children: ReactNode;
  padded?: boolean;
  className?: string;
}) {
  return (
    <section className={`v3-surface${padded ? ' v3-surfacepad' : ''} ${className}`}>
      {children}
    </section>
  );
}

export function V3Empty({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="v3-empty">
      <div className="v3-emptyIcon" aria-hidden="true">
        <Icon size={27} />
      </div>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function V3Features({ items }: { items: ReadonlyArray<{ title: string; text: string }> }) {
  return (
    <div className="v3-features">
      {items.map((item) => (
        <section className="v3-feature" key={item.title}>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </section>
      ))}
    </div>
  );
}
