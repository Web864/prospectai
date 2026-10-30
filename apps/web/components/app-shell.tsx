'use client';

import {
  BarChart3,
  Bell,
  CircleHelp,
  CreditCard,
  FileText,
  Home,
  Lightbulb,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Plus,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { applicationNavigation } from './application-navigation';
import { MobileNavigation } from './mobile-navigation';
import { AccountSession } from './account-session';
import { ThemeToggle } from './theme-toggle';

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
const navigation = [...applicationNavigation, ['Extension', '/app/settings/extension'] as const];
const descriptions: Record<string, string> = {
  Dashboard: 'Your research and prospecting workspace.',
  Research: 'Analyze public website signals to inform better prospecting.',
  Analyses: 'Track website research, processing progress, and analysis results.',
  Opportunities: 'Prioritize potential services and review supporting evidence.',
  Leads: 'Manage researched businesses from discovery to outreach.',
  Pitches: 'Build specific outreach based on verified research.',
  Usage: 'Understand plan allowances and account consumption.',
  Billing: 'Review your plan and manage billing confidently.',
  Settings: 'Personalize your account and prospecting preferences.',
  'Extension management': 'Connect the browser extension to your ProspectAI workspace.',
};

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
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchResults = navigation.filter(([label]) =>
    label.toLowerCase().includes(normalizedQuery),
  );
  const renderNavigation = (items: typeof navigation) =>
    items.map(([label, href]) => (
      <Link
        key={href}
        href={href}
        title={!sidebarExpanded ? label : undefined}
        aria-current={
          activePath === href ||
          (href !== '/app' && href !== '/app/settings' && activePath?.startsWith(`${href}/`))
            ? 'page'
            : undefined
        }
      >
        <span className="v3-symbol" aria-hidden="true">
          <NavigationIcon href={href} />
        </span>
        <span>{label}</span>
      </Link>
    ));
  return (
    <div className={`app-shell v3-app${sidebarExpanded ? '' : ' sidebar-collapsed'}`}>
      <aside className="workspace-sidebar v3-side">
        <Link className="brand workspace-brand v3-logo" href="/" aria-label="ProspectAI home">
          <Image src="/brand-mark.png" alt="" width={34} height={34} priority />
          <span>
            Prospect<span className="brand-accent">AI</span>
          </span>
        </Link>
        <div className="v4-side-scroll">
          <div className="v3-sectionlabel">Workspace</div>
          <nav className="v3-nav" aria-label="Application">
            {renderNavigation(navigation.filter(([, href]) => !href.startsWith('/app/settings')))}
          </nav>
        </div>
        <div className="v4-side-bottom">
          <div className="v3-sectionlabel">Preferences &amp; tools</div>
          <nav className="v3-nav" aria-label="Preferences and tools">
            {renderNavigation(navigation.filter(([, href]) => href.startsWith('/app/settings')))}
          </nav>
          <div className="v3-sidemeta">
            <strong>
              <Lightbulb size={15} aria-hidden="true" /> Evidence first
            </strong>
            Opportunity-focused prospecting.
          </div>
        </div>
      </aside>
      <div className="workspace-main v3-main">
        <header className="workspace-topbar v3-top">
          <button
            className="v3-iconbtn v3-sidebar-toggle"
            type="button"
            aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarExpanded}
            onClick={() => setSidebarExpanded((value) => !value)}
          >
            {sidebarExpanded ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
          </button>
          <div className="v3-mobile-navigation">
            <MobileNavigation />
          </div>
          <div className="v3-topsearch">
            <Search size={17} aria-hidden="true" />
            <label className="sr-only" htmlFor="workspace-search">
              Find a workspace page
            </label>
            <input
              id="workspace-search"
              type="search"
              value={searchQuery}
              placeholder="Search workspace"
              autoComplete="off"
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setSearchQuery('');
              }}
            />
            {normalizedQuery && (
              <nav className="v3-search-results" aria-label="Search results">
                {searchResults.length ? (
                  searchResults.map(([label, href]) => (
                    <Link key={href} href={href} onClick={() => setSearchQuery('')}>
                      <NavigationIcon href={href} />
                      <span>{label}</span>
                    </Link>
                  ))
                ) : (
                  <p>No matching workspace pages.</p>
                )}
              </nav>
            )}
          </div>
          <div className="v3-topactions">
            <ThemeToggle />
            <button
              className="v3-iconbtn"
              type="button"
              aria-label="Notifications unavailable"
              title="Notifications are not available in this workspace"
              disabled
            >
              <Bell size={18} />
            </button>
            <Link className="v3-iconbtn" href="/resources" aria-label="Help">
              <CircleHelp size={19} />
            </Link>
            <AccountSession />
          </div>
        </header>
        <main className="workspace-content v3-content">
          <div className="v3-eyebrow">
            {trail} &nbsp; / &nbsp; {title}
          </div>
          <header className="v3-intro">
            <div>
              <h1>{title}</h1>
              <p className="v3-subtitle">
                {descriptions[title] ?? 'Prospect opportunity intelligence, grounded in evidence.'}
              </p>
            </div>
            {(title === 'Dashboard' || title === 'Analyses') && (
              <Link className="v3-btn" href="/app/research">
                <Plus size={16} />
                {title === 'Analyses' ? 'New analysis' : 'Analyze website'}
              </Link>
            )}
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
