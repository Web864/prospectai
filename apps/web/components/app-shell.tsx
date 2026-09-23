import {
  BarChart3,
  CreditCard,
  FileText,
  Home,
  Lightbulb,
  Crown,
  ChevronRight,
  PieChart,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { applicationNavigation } from './application-navigation';
import { MobileNavigation } from './mobile-navigation';
import { AccountSession } from './account-session';

function NavigationIcon({ href }: { href: string }) {
  const props = { size: 18, strokeWidth: 1.9, 'aria-hidden': true } as const;
  if (href === '/app') return <Home {...props} />;
  if (href === '/app/research') return <Search {...props} />;
  if (href === '/app/analyses') return <BarChart3 {...props} />;
  if (href === '/app/opportunities') return <ShieldCheck {...props} />;
  if (href === '/app/leads') return <Users {...props} />;
  if (href === '/app/pitches') return <FileText {...props} />;
  if (href === '/app/usage') return <PieChart {...props} />;
  if (href === '/app/billing') return <CreditCard {...props} />;
  return <Settings {...props} />;
}

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
  const isExtensionPage = title === 'Extension management';
  const isResearchPage = title === 'Research';

  return (
    <div
      className={`app-shell${title === 'Settings' ? ' settings-shell' : ''}${
        isExtensionPage ? ' extension-management-shell' : ''
      }${isResearchPage ? ' research-shell' : ''}`}
    >
      <aside className="workspace-sidebar">
        <Link className="brand workspace-brand" href="/" aria-label="ProspectAI home">
          <Image src="/brand-mark.png" alt="" width={34} height={34} priority />
          <span>
            Prospect<span className="brand-accent">AI</span>
          </span>
        </Link>
        {!isResearchPage && <div className="workspace-label">Workspace</div>}
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
              <NavigationIcon href={href} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className={isResearchPage ? 'research-sidebar-bottom' : undefined}>
          <Link
            className="extension-nav"
            href="/app/settings/extension"
            aria-current={activePath === '/app/settings/extension' ? 'page' : undefined}
          >
            <ShieldCheck size={18} strokeWidth={1.9} aria-hidden="true" />
            <span>
              <strong>Extension</strong>
              {isResearchPage && <small className="research-connected">Connected</small>}
            </span>
            {isResearchPage && <i className="research-connected-dot" aria-hidden="true" />}
          </Link>
          {activePath === '/app/settings/extension' && !isResearchPage && (
            <span className="extension-nav-status">Connected</span>
          )}
          {isResearchPage ? (
            <Link className="research-upgrade-card" href="/app/billing">
              <Crown size={22} fill="currentColor" aria-hidden="true" />
              <span>
                <strong>Upgrade to Pro</strong>
                <small>Get more analyses,<br />advanced insights and more.</small>
              </span>
              <ChevronRight size={19} aria-hidden="true" />
            </Link>
          ) : (
            <div className="sidebar-note">
              <Lightbulb size={17} aria-hidden="true" />
              <span>Evidence first. Opportunity focused.</span>
            </div>
          )}
        </div>
      </aside>
      <main className="workspace-main">
        <div className="mobile-app-bar">
          <MobileNavigation />
          <Link className="brand workspace-brand" href="/app">
            <Image src="/brand-mark.png" alt="" width={30} height={30} />
            <span>
              Prospect<span className="brand-accent">AI</span>
            </span>
          </Link>
          <AccountSession />
        </div>
        <div className="workspace-content">
          <div className="breadcrumb">
            <span>{trail}</span>
            <span aria-hidden="true">/</span>
            <strong>{title}</strong>
          </div>
          <header className="app-header">
            <div>
              <h1>{title}</h1>
              <p>
                {isExtensionPage
                  ? 'Connect and manage the ProspectAI browser extension.'
                  : isResearchPage
                    ? 'Analyze any business website to discover opportunities, weaknesses, and growth potential.'
                    : 'Prospect opportunity intelligence, grounded in evidence.'}
              </p>
            </div>
            <div className="desktop-account">
              <AccountSession />
            </div>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
