import Link from 'next/link';
import { SiteShell } from '../components/site-shell';

export default function HomePage() {
  return (
    <SiteShell>
      <main className="page">
        <section className="hero">
          <span className="badge badge-positive">AI Prospect Opportunity Intelligence</span>
          <h1>Know what service to sell before you write the first message.</h1>
          <p>
            ProspectAI turns website evidence into clear business interpretation, relevant service
            opportunities, and grounded pitch angles.
          </p>
          <div className="actions">
            <Link className="button" href="/signup">
              Start analyzing
            </Link>
            <Link href="/how-it-works">See how it works</Link>
          </div>
        </section>
        <section className="feature-grid" aria-label="Product method">
          <article className="feature">
            <h2>Evidence</h2>
            <p>See what ProspectAI actually detected and where it came from.</p>
          </article>
          <article className="feature">
            <h2>Interpretation</h2>
            <p>Understand the likely business meaning without inflated claims.</p>
          </article>
          <article className="feature">
            <h2>Opportunity</h2>
            <p>Know which service fits and how to open a credible conversation.</p>
          </article>
        </section>
      </main>
    </SiteShell>
  );
}
