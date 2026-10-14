import { SiteShell } from '../components/site-shell';

export default function NotFound() {
  return (
    <SiteShell>
      <main className="page">
        <h1>Page not found</h1>
        <p className="muted">The page you requested could not be found.</p>
      </main>
    </SiteShell>
  );
}
