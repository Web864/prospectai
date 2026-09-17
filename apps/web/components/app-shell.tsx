import Link from 'next/link';
import type { ReactNode } from 'react';
import { applicationNavigation } from './application-navigation';
import { MobileNavigation } from './mobile-navigation';
import { AccountSession } from './account-session';

export function AppShell({
  title,
  children,
  trail = 'Workspace',
  activePath,
}: {
  title: string;
  children: ReactNode;
  trail?: string;
  activePath?: string;
}) {
  return (
    <div className="app-shell">
      <aside>
        <Link className="brand" href="/">
          ProspectAI
        </Link>
        <nav aria-label="Application">
          {applicationNavigation.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                activePath === href || (href !== '/app' && activePath?.startsWith(`${href}/`))
                  ? 'page'
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link
          href="/app/settings/extension"
          aria-current={activePath === '/app/settings/extension' ? 'page' : undefined}
        >
          Extension
        </Link>
      </aside>
      <main>
        <div className="mobile-app-bar">
          <MobileNavigation />
          <Link className="brand" href="/app">
            ProspectAI
          </Link>
        </div>
        <div className="breadcrumb">
          {trail} / {title}
        </div>
        <header className="app-header">
          <div>
            <h1>{title}</h1>
            <p>Prospect opportunity intelligence, grounded in evidence.</p>
          </div>
          <AccountSession />
        </header>
        {children}
      </main>
    </div>
  );
}
