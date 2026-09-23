import { ArrowRight, Menu } from 'lucide-react';
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
