import Link from 'next/link';
import { supportEmail } from '../lib/support';

type Section = { heading: string; paragraphs?: string[]; items?: string[] };

const privacySections: Section[] = [
  {
    heading: 'Who we are',
    paragraphs: [
      'ProspectAI provides a web application and a Chrome extension that analyze public business websites and help users plan sales outreach. This policy explains what the service processes and why.',
    ],
  },
  {
    heading: 'Information we process',
    items: [
      'Account data: email address, a salted scrypt password hash (or your Google account email when you sign in with Google), workspace name and membership role.',
      'Profile and onboarding answers: your role, the services you sell, target industries and locations, and outreach preferences.',
      'Analyses you request: the public website address, text and metadata retrieved from that site, findings, scores, opportunities and pitch drafts. Retrieved pages can include contact details the website itself publishes, such as a business email address or phone number.',
      'Leads, notes, contacts and activity you add in the workspace.',
      'Guest trial data: an opaque guest token stored by the extension and the analyses run with it. Guest sessions expire after a configurable period (30 days by default).',
      'Extension credentials: short-lived access tokens and rotating refresh tokens, stored only as one-way hashes on our servers.',
      'Billing data: subscription plan and status. Card details are entered on and stored by Stripe, never by ProspectAI.',
      'Security and operational records: audit events (for example sign-ins and subscription changes), and hashed client identifiers used for rate limiting.',
    ],
  },
  {
    heading: 'What the Chrome extension does',
    paragraphs: [
      'The extension reads the address of the active tab only when you open it and choose to analyze that site. It does not monitor browsing, read browsing history, or send page content in the background. Analysis is performed by our servers, which retrieve the public website directly.',
    ],
  },
  {
    heading: 'How we use information',
    items: [
      'To provide analyses, reports, opportunities and pitch drafts you request.',
      'To secure accounts, prevent abuse and enforce plan limits.',
      'To process subscriptions and send transactional email such as verification and password reset messages.',
    ],
    paragraphs: ['We do not sell personal information and we do not use it for advertising.'],
  },
  {
    heading: 'AI processing',
    paragraphs: [
      'When AI assistance is enabled, a summary of the retrieved website content and its findings is sent to the configured AI provider to produce the business summary and pitch drafts. Website content is treated as untrusted input, AI output is validated before it is stored, and scores are calculated by deterministic rules rather than by the AI model. AI output can be wrong; review it before you rely on it or send it.',
    ],
  },
  {
    heading: 'Service providers',
    paragraphs: [
      'ProspectAI relies on providers for hosting and database services, payments (Stripe), sign-in with Google (Google), transactional email (Resend), and AI processing (OpenAI or Google Gemini, depending on configuration). Each receives only the data needed for its function.',
    ],
  },
  {
    heading: 'Retention and deletion',
    paragraphs: [
      'Account data is kept while your account is active. Guest sessions and their raw page content are expired automatically after the guest retention period. To delete your account and workspace data, or to request a copy of it, contact us using the address below; we will confirm the request from your account email.',
    ],
  },
];

const termsSections: Section[] = [
  {
    heading: 'The service',
    paragraphs: [
      'ProspectAI analyzes publicly accessible websites that you choose and produces findings, scores, opportunities and outreach drafts. Findings describe what was observed at the time of analysis; they are evidence to investigate, not guarantees that a business needs a service.',
    ],
  },
  {
    heading: 'Your responsibilities',
    items: [
      'Analyze only websites you are permitted to access, and respect the website owner’s terms.',
      'Review AI-assisted content before use. You are responsible for the messages you send and for complying with the email, marketing and privacy laws that apply to your outreach.',
      'Keep your credentials secure and do not share accounts beyond your plan.',
      'Do not use the service to probe private networks, overload websites, or circumvent usage limits.',
    ],
  },
  {
    heading: 'Plans, billing and cancellation',
    paragraphs: [
      'Paid plans renew automatically each billing period until canceled. You can cancel from the billing portal in your workspace; access to paid features continues until the end of the current period. Monthly analysis allowances reset at the start of each calendar month (UTC).',
    ],
  },
  {
    heading: 'Availability and changes',
    paragraphs: [
      'Analyses depend on third-party websites and providers and can fail or return partial results. We may change or discontinue features and will give reasonable notice of material changes to these terms.',
    ],
  },
];

export function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const sections = kind === 'privacy' ? privacySections : termsSections;
  const email = supportEmail();
  return (
    <main className="page legal">
      <h1>{kind === 'privacy' ? 'Privacy policy' : 'Terms of service'}</h1>
      <p className="legal-notice" role="note">
        Draft pending legal review. This page describes how ProspectAI currently works; the reviewed
        version will replace it before general availability.
      </p>
      {sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.items && (
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
      ))}
      <section>
        <h2>Contact</h2>
        <p>
          {email ? (
            <>
              Email <a href={`mailto:${email}`}>{email}</a> or use the{' '}
              <Link href="/contact">contact page</Link>.
            </>
          ) : (
            <>
              Use the <Link href="/contact">contact page</Link>.
            </>
          )}
        </p>
      </section>
    </main>
  );
}
