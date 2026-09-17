'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { applicationNavigation } from './application-navigation';
import { Drawer } from './interactive-controls';

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
        Menu
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
              {label}
            </Link>
          ))}
          <Link
            href="/app/settings/extension"
            aria-current={pathname === '/app/settings/extension' ? 'page' : undefined}
            onClick={() => setOpen(false)}
          >
            Extension
          </Link>
        </nav>
      </Drawer>
    </div>
  );
}
