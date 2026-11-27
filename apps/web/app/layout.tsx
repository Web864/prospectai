import type { Metadata, Viewport } from 'next';
import { CustomCursor } from '../components/custom-cursor';
import { MotionLayer } from '../components/motion-layer';
import { siteDescription, siteName, siteTagline, siteUrl } from '../lib/site-metadata';
import './globals.css';
import './phase4.css';
import './components.css';
import './homepage.css';
import './how-it-works.css';
import './reference-marketing.css';
import './workspace.css';
import './dashboard.css';
import './design-system.css';
import './theme.css';
import './workspace-redesign.css';
import './motion.css';
import './cursor.css';

const themeBootstrap = `(() => {
  try {
    const stored = localStorage.getItem('prospectai-theme');
    const theme = stored === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = 'light';
  }
})();`;

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: `${siteName}: ${siteTagline}`, template: `%s | ${siteName}` },
  description: siteDescription,
  applicationName: siteName,
  openGraph: { type: 'website', siteName, locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/brand-mark.png', apple: '/brand-mark.png' },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <MotionLayer />
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}
