import { ArrowRight, Github, Linkedin, Menu, Youtube } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { InputHTMLAttributes, ReactNode } from 'react';

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

const navigation = [
  ['Features', '/features'],
  ['Use Cases', '/how-it-works'],
  ['Pricing', '/pricing'],
  ['FAQ', '/faq'],
  ['Resources', '/resources'],
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
            <Link className="home-button home-button-primary nav-cta" href="/signup">
              Start free <ArrowRight size={17} aria-hidden="true" />
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
              <Link className="home-button home-button-primary" href="/signup">
                Start free <ArrowRight size={17} aria-hidden="true" />
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
          <div className="footer-socials" aria-hidden="true">
            <span>X</span>
            <Linkedin size={16} />
            <Youtube size={17} />
            <Github size={16} />
          </div>
          <small>(c) 2026 ProspectAI. All rights reserved.</small>
        </div>
        <nav aria-label="Product links">
          <strong>Product</strong>
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/how-it-works">Use Cases</Link>
          <Link href="/resources">Resources</Link>
        </nav>
        <nav aria-label="Resource links">
          <strong>Resources</strong>
          <Link href="/resources">Guides</Link>
          <Link href="/faq">Help Center</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <nav aria-label="Company links">
          <strong>Company</strong>
          <Link href="/contact">About</Link>
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
      <BrandLink />
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
