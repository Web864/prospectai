import Link from 'next/link';

export const metadata = { title: 'Access needed' };

export default function AdminDenied() {
  return (
    <main className="admin-main">
      <div className="admin-card" style={{ maxWidth: 560, margin: '10vh auto' }}>
        <h1 style={{ margin: 0 }}>Site admin access needed</h1>
        <p style={{ margin: 0, color: 'var(--pa-color-muted)' }}>
          You are signed in, but this account cannot manage website content. Site admins are the
          verified email addresses listed in the server&apos;s SITE_ADMIN_EMAILS setting.
        </p>
        <div className="admin-actions">
          <Link className="admin-btn" href="/app">
            Go to your workspace
          </Link>
          <Link className="admin-btn" href="/">
            Back to the website
          </Link>
        </div>
      </div>
    </main>
  );
}
