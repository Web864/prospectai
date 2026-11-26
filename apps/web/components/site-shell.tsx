import { ArrowRight, Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { InputHTMLAttributes, ReactNode } from 'react';
import './prospect-codex-public.css';

function BrandLink() {
  return (
    <Link className="brand brand-lockup" href="/" aria-label="ProspectAI home">
      <Image src="/brand-mark.png" alt="" width={34} height={34} priority />
      <span>
        Prospect<span className="brand-accent">AI</span>
      </span>
    </Link>
  );
}

// Each item is an independent, crawlable page (not an in-page anchor).
const navigation = [
  ['How it works', '/how-it-works'],
  ['Features', '/features'],
  ['Pricing', '/pricing'],
  ['Resources', '/resources'],
  ['FAQ', '/faq'],
] as const;

export function SiteShell({ children, activePath }: { children: ReactNode; activePath?: string }) {
  return (
    <>
      <header className="marketing-nav">
        <div className="marketing-nav-inner">
          <BrandLink />
          <nav className="marketing-links" aria-label="Main navigation">
            {navigation.map(([label, href]) => (
              <Link
                href={href}
                key={href}
                className={href === activePath ? 'is-active' : undefined}
                aria-current={href === activePath ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="marketing-actions">
            <Link href="/login">Log in</Link>
            <Link className="button button-primary home-button nav-cta" href="/signup">
              Get started <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <details className="marketing-mobile-menu">
            <summary aria-label="Open navigation menu">
              <Menu size={22} aria-hidden="true" />
            </summary>
            <div className="mobile-menu-panel">
              <nav aria-label="Mobile navigation">
                {navigation.map(([label, href]) => (
                  <Link
                    href={href}
                    key={href}
                    className={href === activePath ? 'is-active' : undefined}
                    aria-current={href === activePath ? 'page' : undefined}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
              <Link href="/login">Log in</Link>
              <Link className="button button-primary home-button" href="/signup">
                Get started <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </details>
        </div>
      </header>
      {children}
      <PublicFooter />
    </>
  );
}

export function PublicFooter() {
  return (
    <footer className="home-footer">
      <div className="home-container footer-grid">
        <div className="footer-brand">
          <span>
            <Image src="/brand-mark.png" alt="" width={28} height={28} />
            <strong>ProspectAI</strong>
          </span>
          <p>Real websites. Real insights. Real opportunities.</p>
          <small>© {new Date().getFullYear()} ProspectAI. All rights reserved.</small>
        </div>
        <nav aria-label="Product links">
          <strong>Product</strong>
          <Link href="/features">Features</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>
        <nav aria-label="Resource links">
          <strong>Resources</strong>
          <Link href="/resources">Guides</Link>
          <Link href="/faq">FAQ</Link>
        </nav>
        <nav aria-label="Company links">
          <strong>Company</strong>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
      <div className="home-container footer-bottom">
        <span>Opportunity intelligence, grounded in evidence.</span>
        <span>Built for the people who build business.</span>
      </div>
    </footer>
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
      <div className="form-page-top">
        <BrandLink />
      </div>
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
  ...props
}: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'children'>) {
  return (
    <label className="field">
      {label}
      <input {...props} />
    </label>
  );
}
