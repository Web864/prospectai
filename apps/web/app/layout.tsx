import type { Metadata } from 'next';
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
  title: 'ProspectAI',
  description: 'Prospect opportunity intelligence.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
