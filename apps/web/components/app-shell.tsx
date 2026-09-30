'use client';

import {
  BarChart3,
  Bell,
  CircleHelp,
  CreditCard,
  FileText,
  Home,
  Lightbulb,
  Crown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useState } from 'react';
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

const searchableNavigation = [
  ...applicationNavigation,
  ['Extension', '/app/settings/extension'] as const,
];

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
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const isExtensionPage = title === 'Extension management';
  const isResearchPage = title === 'Research';
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const searchResults = normalizedQuery
    ? searchableNavigation.filter(([label]) => label.toLocaleLowerCase().includes(normalizedQuery))
    : [];

  return (
    <div
      className={`app-shell${sidebarExpanded ? '' : ' sidebar-collapsed'}${
        title === 'Settings' ? ' settings-shell' : ''
      }${isExtensionPage ? ' extension-management-shell' : ''}${
        isResearchPage ? ' research-shell' : ''
      }`}
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
                <small>
                  Get more analyses,
                  <br />
                  advanced insights and more.
                </small>
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
        <header className="workspace-topbar">
          <Link className="brand workspace-brand workspace-topbar-brand" href="/app">
            <Image src="/brand-mark.png" alt="" width={30} height={30} />
            <span>
              Prospect<span className="brand-accent">AI</span>
            </span>
          </Link>
          <button
            className="workspace-topbar-button workspace-sidebar-toggle"
            type="button"
            aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarExpanded}
            onClick={() => setSidebarExpanded((expanded) => !expanded)}
          >
            {sidebarExpanded ? (
              <PanelLeftClose size={19} aria-hidden="true" />
            ) : (
              <PanelLeftOpen size={19} aria-hidden="true" />
            )}
          </button>
          <div className="workspace-mobile-menu">
            <MobileNavigation />
          </div>
          <div className="workspace-live-search">
            <Search size={18} aria-hidden="true" />
            <label className="sr-only" htmlFor="workspace-search">
              Search workspace
            </label>
            <input
              id="workspace-search"
              type="search"
              value={searchQuery}
              placeholder="Search workspace"
              autoComplete="off"
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {normalizedQuery && (
              <div className="workspace-search-results" role="listbox" aria-label="Search results">
                {searchResults.length > 0 ? (
                  searchResults.map(([label, href]) => (
                    <Link
                      key={href}
                      href={href}
                      role="option"
                      aria-selected="false"
                      onClick={() => setSearchQuery('')}
                    >
                      <NavigationIcon href={href} />
                      <span>{label}</span>
                    </Link>
                  ))
                ) : (
                  <span>No matching workspace pages.</span>
                )}
              </div>
            )}
          </div>
          <div className="workspace-topbar-actions">
            <details className="workspace-notifications">
              <summary className="workspace-topbar-button" aria-label="Notifications">
                <Bell size={19} aria-hidden="true" />
              </summary>
              <div className="workspace-notification-panel">
                <strong>Notifications</strong>
                <p>No new notifications.</p>
              </div>
            </details>
            <Link className="workspace-topbar-button" href="/resources" aria-label="Help">
              <CircleHelp size={19} aria-hidden="true" />
            </Link>
            <AccountSession />
          </div>
        </header>
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
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
