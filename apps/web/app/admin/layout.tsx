import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './admin.css';
import '../content.css';

export const metadata: Metadata = {
  title: { default: 'Site admin', template: '%s | Site admin' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="admin-shell">{children}</div>;
}
