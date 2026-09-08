import Link from 'next/link';
import type { ReactNode } from 'react';

const navigation = [
  ['Dashboard', '/app'],
  ['Leads', '/app/leads'],
  ['Usage', '/app/usage'],
  ['Billing', '/app/billing'],
  ['Settings', '/app/settings'],
] satisfies ReadonlyArray<readonly [string, string]>;
export function AppShell({
  title,
  children,
  trail = 'Workspace',
}: {
  title: string;
  children: ReactNode;
  trail?: string;
}) {
  return (
    <div className="app-shell">
      <aside>
        <Link className="brand" href="/">
          ProspectAI
        </Link>
        <nav aria-label="Application">
          {navigation.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/app/settings/extension">Extension</Link>
      </aside>
      <main>
        <div className="breadcrumb">
          {trail} / {title}
        </div>
        <header className="app-header">
          <div>
            <h1>{title}</h1>
            <p>Prospect opportunity intelligence, grounded in evidence.</p>
          </div>
          <button className="icon-button" aria-label="Open account menu">
            AC
          </button>
        </header>
        {children}
      </main>
    </div>
  );
}
