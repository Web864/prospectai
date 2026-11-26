import Link from 'next/link';
import { supportEmail } from '../lib/support';

export function ContactPage() {
  const email = supportEmail();
  return (
    <main className="page legal">
      <h1>Contact ProspectAI</h1>
      <p>
        Questions about the product, a problem with an analysis, billing, or a privacy request: we
        read every message.
      </p>
      {email ? (
        <p>
          <a className="button button-primary" href={`mailto:${email}`}>
            Email {email}
          </a>
        </p>
      ) : (
        <p>The support address has not been configured for this deployment yet.</p>
      )}
      <h2>Before you write</h2>
      <ul>
        <li>
          For a failed or partial analysis, include the website address and the time you ran it.
        </li>
        <li>
          For billing changes and cancellation, the billing portal in your workspace is fastest.
        </li>
        <li>For account or data deletion requests, write from the email address on the account.</li>
      </ul>
      <p>
        Looking for answers first? See the <Link href="/faq">FAQ</Link> or{' '}
        <Link href="/how-it-works">how ProspectAI works</Link>.
      </p>
    </main>
  );
}
