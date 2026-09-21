'use client';

import {
  BarChart3,
  CreditCard,
  FileSearch,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Puzzle,
  Search,
  Settings,
  Target,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { applicationNavigation } from './application-navigation';
import { Drawer } from './interactive-controls';

function NavigationIcon({ href }: { href: string }) {
  const props = { size: 18, strokeWidth: 1.9, 'aria-hidden': true } as const;
  if (href === '/app') return <LayoutDashboard {...props} />;
  if (href === '/app/research') return <Search {...props} />;
  if (href === '/app/analyses') return <FileSearch {...props} />;
  if (href === '/app/opportunities') return <Target {...props} />;
  if (href === '/app/leads') return <Users {...props} />;
  if (href === '/app/pitches') return <MessageSquareText {...props} />;
  if (href === '/app/usage') return <BarChart3 {...props} />;
  if (href === '/app/billing') return <CreditCard {...props} />;
  return <Settings {...props} />;
}

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <div className="mobile-navigation">
      <button
        className="icon-button"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={20} aria-hidden="true" />
      </button>
      <Drawer open={open} onOpenChange={setOpen} title="ProspectAI navigation">
        <nav aria-label="Mobile application">
          {applicationNavigation.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                pathname === href || (href !== '/app' && pathname.startsWith(`${href}/`))
                  ? 'page'
                  : undefined
              }
              onClick={() => setOpen(false)}
            >
              <NavigationIcon href={href} />
              <span>{label}</span>
            </Link>
          ))}
          <Link
            href="/app/settings/extension"
            aria-current={pathname === '/app/settings/extension' ? 'page' : undefined}
            onClick={() => setOpen(false)}
          >
            <Puzzle size={18} aria-hidden="true" />
            <span>Extension</span>
          </Link>
        </nav>
      </Drawer>
    </div>
  );
}
