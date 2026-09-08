import Link from 'next/link';
import type { ReactNode } from 'react';

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="marketing-nav">
        <Link className="brand" href="/">
          ProspectAI
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/features">Features</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>
        </nav>
        <div className="actions">
          <Link href="/login">Log in</Link>
          <Link className="button" href="/signup">
            Start free
          </Link>
        </div>
      </header>
      {children}
    </>
  );
}

export function FormPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="form-wrap">
      <Link className="brand" href="/">
        ProspectAI
      </Link>
      <section className="form-panel">
        <div>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
        {children}
      </section>
    </main>
  );
}

export function TextField({
  label,
  type = 'text',
  placeholder,
}: {
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      {label}
      <input type={type} placeholder={placeholder} />
    </label>
  );
}
