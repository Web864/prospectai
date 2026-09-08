import type { Metadata } from 'next';
import './globals.css';
import './phase4.css';

export const metadata: Metadata = {
  title: 'ProspectAI',
  description: 'Prospect opportunity intelligence.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
