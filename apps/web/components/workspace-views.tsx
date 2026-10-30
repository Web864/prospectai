'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import {
  FileText,
  CalendarDays,
  BarChart3,
  Package,
  PieChart,
  Download,
  Settings,
  UserRound,
  CreditCard,
  SlidersHorizontal,
  Link2,
  Bell,
  Shield,
  BriefcaseBusiness,
  Tag,
  FileText as FieldFileText,
  Save,
  ArrowRight,
  Target,
} from 'lucide-react';
import {
  actionResponseSchema,
  analysisAcceptedResponseSchema,
  analysisListResponseSchema,
  opportunityListResponseSchema,
  pitchListResponseSchema,
  settingsResponseSchema,
  subscriptionResponseSchema,
  usageResponseSchema,
} from '@prospectai/validation';
import { V3Stat, V3Panel, V3Empty, V3Features } from './workspace-v3';
import { AnalysisCollection } from './analysis-collection';
import { Badge, Button } from './design-system';
import { ResourceFeedback } from './resource-feedback';
import { useApiResource } from '../lib/use-api-resource';
import { ApiClientError, webApiRequest } from '../lib/web-api';

export function ResearchView() {
  const operation = useRef(false);
  const submission = useRef<{ url: string; key: string } | null>(null);
  const [status, setStatus] = useState<{ busy: boolean; message: string }>({
    busy: false,
    message: '',
  });
  const [url, setUrl] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (operation.current) return;
    const submittedUrl = String(new FormData(event.currentTarget).get('url') ?? '');
    operation.current = true;
    if (submission.current?.url !== submittedUrl)
      submission.current = { url: submittedUrl, key: crypto.randomUUID() };
    setStatus({ busy: true, message: '' });
    try {
      const result = await webApiRequest('/analyses', analysisAcceptedResponseSchema, {
        method: 'POST',
        headers: { 'Idempotency-Key': submission.current.key },
        body: JSON.stringify({ url: submittedUrl }),
      });
      window.location.assign(`/app/analysis/pending?job=${encodeURIComponent(result.data.jobId)}`);
    } catch (error) {
      setStatus({
        busy: false,
        message: error instanceof ApiClientError ? error.message : 'Analysis could not start.',
      });
    } finally {
      operation.current = false;
    }
  }

  const examples = [
    { name: 'Apple', url: 'https://www.apple.com' },
    { name: 'Stripe', url: 'https://stripe.com' },
    { name: 'Notion', url: 'https://www.notion.so' },
    { name: 'HubSpot', url: 'https://www.hubspot.com' },
  ];
  return (
    <>
      <V3Panel padded>
        <div className="v3-subhead">
          <h2>Analyze a website</h2>
          <span className="v3-state">Core workflow</span>
        </div>
        <p>Enter a business website to begin your research.</p>
        <form className="v3-research-form" onSubmit={(event) => void submit(event)}>
          <input
            className="v3-field"
            name="url"
            type="url"
            inputMode="url"
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example-business.com"
            aria-label="Company website"
          />
          <Button className="v3-btn" type="submit" disabled={status.busy}>
            {status.busy ? 'Starting analysis...' : 'Analyze website'}
            <ArrowRight size={17} aria-hidden="true" />
          </Button>
        </form>
        {status.message && (
          <p className="v3-research-feedback" role="alert">
            {status.message}
          </p>
        )}
      </V3Panel>
      <div className="v3-features">
        {[
          ['01', 'Find the signals', 'Gather relevant public website evidence.'],
          ['02', 'Interpret the context', 'Separate observations from possible business needs.'],
          ['03', 'Explore opportunities', 'Review suggestions before saving or creating outreach.'],
        ].map(([step, title, text]) => (
          <section className="v3-feature" key={step}>
            <span className="v3-state">{step}</span>
            <b>{title}</b>
            <p>{text}</p>
          </section>
        ))}
      </div>
      <V3Panel padded>
        <h2>Try an example</h2>
        <div className="v3-research-example-grid">
          {examples.map((example) => (
            <button
              className="v3-btn v3-secondary"
              type="button"
              key={example.name}
              onClick={() => setUrl(example.url)}
            >
              {example.name}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      </V3Panel>
    </>
  );
}

export function AnalysesView() {
  const { state, retry } = useApiResource('/analyses', analysisListResponseSchema);

  return (
    <ResourceFeedback
      state={state}
      retry={retry}
      notFoundTitle="Analysis history API is not available yet"
    >
      {({ data }) => <AnalysisCollection analyses={data} />}
    </ResourceFeedback>
  );
}

export function OpportunitiesView() {
  const { state, retry } = useApiResource('/opportunities', opportunityListResponseSchema);

  return (
    <ResourceFeedback
      state={state}
      retry={retry}
      notFoundTitle="Opportunity API is not available yet"
    >
      {({ data }) => (
        <>
          <div className="v3-stats">
            <V3Stat
              icon={Target}
              title="Total opportunities"
              value={String(data.length)}
              note="Loaded from workspace"
            />
            <V3Stat
              icon={Target}
              title="High priority"
              value={String(data.filter((item) => item.opportunityScore >= 70).length)}
              note="Score 70+"
            />
            <V3Stat
              icon={Target}
              title="Average score"
              value={
                data.length
                  ? String(
                      Math.round(
                        data.reduce((sum, item) => sum + item.opportunityScore, 0) / data.length,
                      ),
                    )
                  : '--'
              }
              note="Across loaded opportunities"
            />
            <V3Stat
              icon={Target}
              title="Categories"
              value={String(new Set(data.map((item) => item.serviceCategory)).size)}
              note="Recommended services"
            />
          </div>

          <section className="v3-surface">
            <div className="v3-toolrow">
              <input
                className="v3-field v3-search"
                aria-label="Search opportunities"
                placeholder="Search opportunities..."
                disabled
                title="Filtering is not available until the opportunities query contract supports it"
              />
              <span className="muted">Opportunity filtering is not available yet.</span>
            </div>

            <div>
              {data.map((item) => (
                <article className="v3-opportunity-row" key={item.id}>
                  <div className="opportunity-icon green">
                    <Target size={22} aria-hidden="true" />
                  </div>

                  <div className="v3-opportunity-copy">
                    <h3>{item.title}</h3>
                    <small>{item.domain}</small>
                    <p>{item.serviceCategory}</p>
                    <small>Confidence: {Math.round(item.confidence * 100)}%</small>
                  </div>

                  <div className="v3-score">
                    <strong className="v3-score-value">{item.opportunityScore}</strong>
                    <small>Opportunity score</small>
                  </div>

                  <Badge tone={item.opportunityScore >= 70 ? 'positive' : 'neutral'}>
                    {item.opportunityScore >= 70 ? 'High priority' : 'Review opportunity'}
                  </Badge>

                  <div className="opportunity-actions">
                    <Link href={`/app/analysis/${encodeURIComponent(item.analysisId)}`}>
                      View evidence
                    </Link>
                    {/* <button>⋮</button> */}
                    {/* <span>›</span> */}
                  </div>
                </article>
              ))}
              {data.length === 0 && (
                <V3Empty
                  icon={Target}
                  title="No opportunities yet"
                  action={
                    <Link className="v3-btn" href="/app/research">
                      Analyze a website
                    </Link>
                  }
                >
                  Complete an analysis to begin evaluating evidence-backed opportunities.
                </V3Empty>
              )}
            </div>
          </section>
        </>
      )}
    </ResourceFeedback>
  );
}

export function PitchesView() {
  const { state, retry } = useApiResource('/pitches', pitchListResponseSchema);
  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Pitch API is not available yet">
      {({ data }) => (
        <>
          {data.length ? (
            <div className="v3-stack">
              {data.map((pitch) => (
                <V3Panel key={pitch.id} padded>
                  <div className="v3-subhead">
                    <h2>{pitch.format} pitch</h2>
                    <time className="v3-caption" dateTime={pitch.updatedAt}>
                      {pitch.updatedAt.slice(0, 10)}
                    </time>
                  </div>
                  <p className="v3-pitch-body">{pitch.content}</p>
                  {pitch.analysisId && (
                    <Link
                      className="v3-btn v3-secondary"
                      href={`/app/analysis/${encodeURIComponent(pitch.analysisId)}`}
                    >
                      View evidence
                    </Link>
                  )}
                </V3Panel>
              ))}
            </div>
          ) : (
            <V3Panel>
              <V3Empty
                icon={FileText}
                title="No generated pitches"
                action={
                  <div className="v3-empty-actions">
                    <Link className="v3-btn" href="/app/opportunities">
                      Create your first pitch
                    </Link>
                    <Link className="v3-btn v3-secondary" href="/app/opportunities">
                      View opportunities
                    </Link>
                  </div>
                }
              >
                Use a researched opportunity as the starting point for personalized outreach.
              </V3Empty>
            </V3Panel>
          )}
          <V3Features
            items={[
              {
                title: 'Evidence-led context',
                text: 'Keep source facts distinct from sales assumptions.',
              },
              { title: 'Editable messaging', text: 'Review and refine before contacting anyone.' },
              { title: 'Connected journey', text: 'Move from research to prospect to outreach.' },
            ]}
          />
        </>
      )}
    </ResourceFeedback>
  );
}

export function UsageView() {
  const { state, retry } = useApiResource('/usage', usageResponseSchema);
  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Usage API is not available yet">
      {({ data }) => (
        <>
          <section className="v3-stats" aria-label="Usage metrics">
            <V3Stat
              title="Current plan"
              value={data.plan}
              note="Current entitlement"
              icon={Package}
            />
            <V3Stat
              title="Used analyses"
              value={data.used}
              note="This billing period"
              icon={BarChart3}
            />
            <V3Stat
              title="Remaining"
              value={data.remaining ?? 'Uncapped'}
              note="Server-authoritative"
              icon={PieChart}
            />
            <V3Stat
              title="Billing period"
              value={data.periodEnd.slice(5, 10)}
              note="Period ends (UTC)"
              icon={CalendarDays}
            />
          </section>
          <V3Panel padded>
            <h2>Analysis allowance</h2>
            <p>
              {data.remaining === null
                ? 'No fixed analysis limit.'
                : `${data.remaining} remaining of ${data.limit} total`}
            </p>
            {data.limit !== null && (
              <div
                className="v3-progress"
                role="progressbar"
                aria-label="Analysis allowance used"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={
                  data.limit === 0 ? 100 : Math.min(100, Math.round((data.used / data.limit) * 100))
                }
              >
                <span
                  style={{
                    width: `${data.limit === 0 ? 100 : Math.min(100, (data.used / data.limit) * 100)}%`,
                  }}
                />
              </div>
            )}
            <p className="v3-caption">
              {data.limit === null
                ? 'Uncapped entitlement'
                : `${data.limit === 0 ? 100 : Math.round((data.used / data.limit) * 100)}% used`}
            </p>
            <p className="v3-caption">
              {data.limit === null ? 'No fixed limit' : `${data.limit} total`}
            </p>
            <div className="v3-note">
              {data.periodStart.slice(0, 10)} - {data.periodEnd.slice(0, 10)} (UTC)
            </div>
            {data.quotaReached && <p role="status">Your analysis allowance has been reached.</p>}
            <div className="v3-allowance-actions">
              <Link className="v3-btn v3-secondary" href="/app/billing">
                View plans
              </Link>
            </div>
          </V3Panel>
          <V3Panel padded>
            <h2>Recent usage</h2>
            <p>Usage history is not available in this response</p>
            <p className="v3-caption">
              Current usage and entitlement values above are authoritative.
            </p>
          </V3Panel>
        </>
      )}
    </ResourceFeedback>
  );
}

export function BillingView() {
  const { state, retry } = useApiResource('/billing', subscriptionResponseSchema);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function billingAction(action: 'upgrade' | 'downgrade' | 'cancel') {
    if (busy) return;
    setBusy(true);
    try {
      const result = await webApiRequest('/billing/portal', actionResponseSchema, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setMessage(result.data.message);
      if (result.data.next?.startsWith('https://')) window.location.assign(result.data.next);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : 'Billing could not be updated.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Billing API is not available yet">
      {({ data }) => (
        <>
          <section className="v3-billing">
            <div className="v3-subhead">
              <div>
                <div className="v3-caption">CURRENT PLAN</div>
                <h2 className="v3-plan-name">{data.plan}</h2>
                <p>Your workspace subscription</p>
              </div>
              <span className="v3-state">{data.status.replaceAll('_', ' ')}</span>
            </div>
            <p>Manage plan details, invoices, and upgrades in one place.</p>
            {data.currentPeriodEnd && (
              <p className="v3-caption">
                Current period ends {data.currentPeriodEnd.slice(0, 10)} (UTC)
                {data.cancelAtPeriodEnd ? '. Cancellation scheduled.' : ''}
              </p>
            )}
            <div className="v3-allowance-actions">
              <Button
                className="v3-btn v3-secondary"
                disabled={busy}
                onClick={() => void billingAction('upgrade')}
              >
                {busy ? 'Opening billing...' : 'Explore plan options'}
              </Button>
              <Button
                className="v3-btn v3-secondary"
                disabled
                title="Invoice download is not available yet"
              >
                <Download size={17} />
                Download invoice
              </Button>
              <Button
                className="v3-btn v3-secondary"
                disabled
                title="Plan management is not available yet"
              >
                <Settings size={17} />
                Manage plan
              </Button>
            </div>
          </section>
          <div className="v3-features">
            <section className="v3-feature">
              <h3>Plan allowances</h3>
              <p>Review current consumption and remaining analyses.</p>
              <Link className="v3-caption" href="/app/usage">
                View usage and allowances
              </Link>
            </section>
            <section className="v3-feature">
              <h3>Billing history</h3>
              <p>Invoice download is not available in this workspace.</p>
            </section>
            <section className="v3-feature">
              <h3>Account management</h3>
              <p>Review your plan options through the billing provider.</p>
              <Link className="v3-caption" href="/faq">
                Billing help
              </Link>
            </section>
          </div>
          {message && (
            <p className="v3-note" role="status">
              {message}
            </p>
          )}
        </>
      )}
    </ResourceFeedback>
  );
}

export function SettingsView({ extensionOnly = false }: { extensionOnly?: boolean }) {
  const { state, retry } = useApiResource('/settings', settingsResponseSchema);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await webApiRequest('/settings', actionResponseSchema, {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: form.get('displayName'),
          role: form.get('role'),
          services: String(form.get('services') ?? '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          outreachPreferences: form.get('outreachPreferences'),
        }),
      });
      setMessage(result.data.message);
      retry();
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : 'Settings could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      const result = await webApiRequest('/extension/session', actionResponseSchema, {
        method: 'DELETE',
      });
      setMessage(result.data.message);
      retry();
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : 'Extension could not be disconnected.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (extensionOnly) {
    return (
      <ResourceFeedback
        state={state}
        retry={retry}
        notFoundTitle="Settings API is not available yet"
      >
        {({ data }) => (
          <>
            <V3Panel padded>
              <div className="v3-subhead">
                <h2>Chrome extension</h2>
                <span className={`v3-state${data.extension.connected ? '' : ' v3-grey'}`}>
                  {data.extension.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <p>
                {data.extension.connected
                  ? 'The extension is connected to this workspace.'
                  : 'No extension session is connected to this workspace. Guest research remains available in the extension.'}
              </p>
              <p className="v3-caption v3-integration-state">
                Session status: {data.extension.status}
              </p>
              <div className="v3-allowance-actions">
                {data.extension.connected ? (
                  <Button className="v3-btn" disabled={busy} onClick={() => void disconnect()}>
                    <Link2 size={17} />
                    {busy ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                ) : (
                  <Link className="v3-btn" href="/extension/connect">
                    <Link2 size={17} />
                    Reconnect
                  </Link>
                )}
                <button
                  className="v3-btn v3-secondary"
                  type="button"
                  disabled
                  title="The Chrome Web Store listing is not available yet"
                >
                  View in Chrome Web Store
                </button>
                <Link className="v3-btn v3-secondary" href="/faq">
                  View installation instructions
                </Link>
              </div>
            </V3Panel>
            <V3Features
              items={[
                { title: 'Analyze websites', text: 'Research business websites while browsing.' },
                {
                  title: 'Capture prospects',
                  text: 'Save researched businesses to your workspace.',
                },
                { title: 'Check sync status', text: 'Confirm the workspace connection above.' },
              ]}
            />
            <V3Panel padded>
              <h2>Having issues?</h2>
              <p>
                Make sure the extension is enabled in Chrome, then refresh your browser and try
                again.
              </p>
              <Link className="v3-caption" href="/faq">
                View help center
              </Link>
            </V3Panel>
            {message && (
              <p className="v3-note" role="status">
                {message}
              </p>
            )}
          </>
        )}
      </ResourceFeedback>
    );
  }

  const settingNav = [
    { label: 'Profile', description: 'Personal information', icon: UserRound },
    { label: 'Account', description: 'Plan and billing', icon: CreditCard },
    { label: 'Preferences', description: 'App settings', icon: SlidersHorizontal },
    { label: 'Integrations', description: 'Connected tools', icon: Link2 },
    { label: 'Notifications', description: 'Email and updates', icon: Bell },
    { label: 'Security', description: 'Password and access', icon: Shield },
  ];

  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Settings API is not available yet">
      {({ data }) => (
        <div className="v3-split">
          <aside className="v3-surface v3-surfacepad" aria-label="Settings sections">
            <h2>Settings categories</h2>
            <div className="v3-settings-categories" />
            {settingNav.map(({ label, description, icon: Icon }, index) => (
              <button
                className={`v3-setting v3-setting-button${index === 0 ? ' v3-current-setting' : ''}`}
                key={label}
                type="button"
                aria-current={index === 0 ? 'page' : undefined}
                disabled={index !== 0}
                title={index !== 0 ? `${label} settings are not available yet` : undefined}
              >
                <span className="v3-setting-icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.8} />
                </span>
                <span className="v3-setting-copy">
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
              </button>
            ))}
          </aside>

          <form
            className="v3-surface v3-surfacepad v3-settings-form"
            onSubmit={(event) => void submit(event)}
          >
            <div className="v3-form-heading">
              <h2>Profile information</h2>
              <p>Update your profile details and how ProspectAI personalizes your experience.</p>
            </div>

            <label className="v3-form-field">
              <span className="v3-field-label" id="settings-display-name-label">
                Display name
              </span>
              <span className="v3-control">
                <UserRound size={19} strokeWidth={1.8} aria-hidden="true" />
                <input
                  aria-labelledby="settings-display-name-label"
                  name="displayName"
                  defaultValue={data.displayName ?? ''}
                />
              </span>
              <small>This name will be shown in your workspace.</small>
            </label>

            <label className="v3-form-field">
              <span className="v3-field-label" id="settings-role-label">
                Role
              </span>
              <span className="v3-control">
                <BriefcaseBusiness size={19} strokeWidth={1.8} aria-hidden="true" />
                <select
                  aria-labelledby="settings-role-label"
                  name="role"
                  defaultValue={data.role ?? ''}
                >
                  {data.role &&
                    ![
                      'Freelancer',
                      'Agency owner',
                      'Consultant',
                      'Sales',
                      'Marketing',
                      'Other',
                    ].includes(data.role) && <option value={data.role}>{data.role}</option>}
                  <option value="">Select a role</option>
                  <option value="Freelancer">Freelancer</option>
                  <option value="Agency owner">Agency owner</option>
                  <option value="Consultant">Consultant</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Other">Other</option>
                </select>
              </span>
              <small>Your role helps us tailor recommendations.</small>
            </label>

            <label className="v3-form-field">
              <span className="v3-field-label" id="settings-services-label">
                Services
              </span>
              <span className="v3-control">
                <Tag size={19} strokeWidth={1.8} aria-hidden="true" />
                <input
                  aria-labelledby="settings-services-label"
                  name="services"
                  defaultValue={data.services.join(', ')}
                />
              </span>
              <small>List the services you offer (e.g., web design, SEO, marketing).</small>
            </label>

            <label className="v3-form-field">
              <span className="v3-field-label" id="settings-outreach-label">
                Outreach preferences
              </span>
              <span className="v3-control">
                <FieldFileText size={19} strokeWidth={1.8} aria-hidden="true" />
                <textarea
                  aria-labelledby="settings-outreach-label"
                  name="outreachPreferences"
                  rows={2}
                  placeholder="Tell us about your preferred outreach style, industries, or any specific notes..."
                  defaultValue={data.outreachPreferences ?? ''}
                />
              </span>
              <small>This helps generate more relevant opportunities and pitches.</small>
            </label>

            {message && (
              <p className="v3-note" role="status">
                {message}
              </p>
            )}

            <Button className="v3-btn" type="submit" disabled={busy}>
              <Save size={19} strokeWidth={2} aria-hidden="true" />
              {busy ? 'Saving...' : 'Save settings'}
            </Button>
          </form>
        </div>
      )}
    </ResourceFeedback>
  );
}
