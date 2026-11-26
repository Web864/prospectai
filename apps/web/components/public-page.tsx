import type { ReactNode } from 'react';
import { publicPages } from '../lib/site-metadata';
import { SiteShell } from './site-shell';
import { StructuredData, breadcrumbStructuredData } from './structured-data';

/** Shell for an independent, statically rendered public page with its breadcrumb schema. */
export function PublicPage({ path, children }: { path: string; children: ReactNode }) {
  const page = publicPages.find((entry) => entry.path === path);
  return (
    <SiteShell activePath={path}>
      {page && <StructuredData data={breadcrumbStructuredData(page.title, page.path)} />}
      {children}
    </SiteShell>
  );
}
