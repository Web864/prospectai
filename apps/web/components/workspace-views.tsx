'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { FileText, CheckCircle2, Clock3, AlertTriangle, Search, Eye, MoreVertical, Plus, CalendarDays, Crown, Zap, BarChart3, Package, PieChart, Download, Settings, RotateCcw, ExternalLink, HelpCircle, UserRound, CreditCard, SlidersHorizontal, Link2, Bell, Shield, BriefcaseBusiness, Tag, FileText as FieldFileText, Save, Database, Globe2, ArrowRight, Target, Lightbulb, Mail, Check, type LucideIcon } from 'lucide-react';
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
import { Badge, Button, Metric, StatePanel } from './design-system';
import { ResourceFeedback } from './resource-feedback';
import { useApiResource } from '../lib/use-api-resource';
import { ApiClientError, webApiRequest } from '../lib/web-api';

export function ResearchView() {
  const [status, setStatus] = useState<{ busy: boolean; message: string }>({
    busy: false,
    message: '',
  });
  const [url, setUrl] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.busy) return;
    const submittedUrl = String(new FormData(event.currentTarget).get('url') ?? '');
    setStatus({ busy: true, message: '' });
    try {
      const result = await webApiRequest('/analyses', analysisAcceptedResponseSchema, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ url: submittedUrl }),
      });
      window.location.assign(`/app/analysis/pending?job=${encodeURIComponent(result.data.jobId)}`);
    } catch (error) {
      setStatus({
        busy: false,
        message: error instanceof ApiClientError ? error.message : 'Analysis could not start.',
      });
    }
  }

  const examples = [
    { name: 'Apple', url: 'https://www.apple.com', mark: '', className: 'apple' },
    { name: 'Stripe', url: 'https://stripe.com', mark: 'S', className: 'stripe' },
    { name: 'Notion', url: 'https://www.notion.so', mark: 'N', className: 'notion' },
    { name: 'HubSpot', url: 'https://www.hubspot.com', mark: '⌘', className: 'hubspot' },
  ];

  return (
    <div className="research-page">
      <section className="research-hero-card">
        <div className="research-hero-copy">
          <div className="research-heading-row">
            <span className="research-globe-icon" aria-hidden="true">
              <Globe2 size={29} strokeWidth={2.1} />
            </span>
            <div>
              <span className="research-kicker">Website analysis</span>
              <h2>Enter a company website</h2>
              <p>Get AI-powered insights, find opportunities, and generate outreach ideas in seconds.</p>
            </div>
          </div>

          <form className="research-url-form" onSubmit={(event) => void submit(event)}>
            <div className="research-url-input">
              <Link2 size={21} strokeWidth={2} aria-hidden="true" />
              <input
                name="url"
                type="url"
                inputMode="url"
                required
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://company.com"
                aria-label="Company website"
              />
            </div>
            <Button type="submit" className="research-analyze-button" disabled={status.busy}>
              <Search size={20} strokeWidth={2.1} aria-hidden="true" />
              <span>{status.busy ? 'Starting analysis...' : 'Analyze website'}</span>
              <ArrowRight size={20} strokeWidth={2} aria-hidden="true" />
            </Button>
          </form>

          {status.message && (
            <p className="form-message form-message-error research-error" role="alert">
              {status.message}
            </p>
          )}

          <div className="research-benefits" aria-label="Analysis benefits">
            <div>
              <span className="research-benefit-icon"><Shield size={19} fill="currentColor" /></span>
              <span><strong>Secure &amp; private</strong><small>We only analyze the page you choose</small></span>
            </div>
            <div>
              <span className="research-benefit-icon"><Zap size={20} fill="currentColor" /></span>
              <span><strong>AI-powered insights</strong><small>Find real opportunities</small></span>
            </div>
            <div>
              <span className="research-benefit-icon"><BarChart3 size={20} /></span>
              <span><strong>Actionable results</strong><small>Turn insights into outreach</small></span>
            </div>
          </div>
        </div>

        <div className="research-visual" aria-hidden="true">
          <div className="research-browser-card">
            <div className="research-browser-dots"><i /><i /><i /></div>
            <div className="research-browser-body">
              <span className="research-browser-globe"><Globe2 size={25} /></span>
              <div className="research-browser-copy">
                <i /><i /><i /><i />
              </div>
              <div className="research-score-ring"><strong>94</strong></div>
              <div className="research-browser-lines"><i /><i /><i /><i /></div>
            </div>
          </div>
          <div className="research-checklist">
            {['Website analysis', 'Opportunity insights', 'Outreach recommendations'].map((item) => (
              <div key={item}>
                <span><Check size={14} strokeWidth={3} /></span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="research-examples-section">
        <div className="research-section-heading">
          <h2>Try an example</h2>
          <button type="button">View more examples <ArrowRight size={17} /></button>
        </div>
        <div className="research-example-grid">
          {examples.map((example) => (
            <button
              type="button"
              className="research-example-card"
              key={example.name}
              onClick={() => setUrl(example.url)}
            >
              <span className={`research-example-logo ${example.className}`}>{example.mark}</span>
              <span className="research-example-copy">
                <strong>{example.name}</strong>
                <small>{example.url}</small>
              </span>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
      </section>

      <section className="research-output-card">
        <h2>What you’ll get</h2>
        <div className="research-output-grid">
          <div className="research-output-item">
            <span className="research-output-icon green"><FileText size={25} /></span>
            <div><strong>Website analysis</strong><p>Technical, SEO, content, UX,<br />and more</p></div>
          </div>
          <div className="research-output-item">
            <span className="research-output-icon purple"><Target size={25} /></span>
            <div><strong>Opportunity scoring</strong><p>Identify real business<br />opportunities</p></div>
          </div>
          <div className="research-output-item">
            <span className="research-output-icon amber"><Lightbulb size={26} /></span>
            <div><strong>AI insights</strong><p>Evidence-based<br />recommendations</p></div>
          </div>
          <div className="research-output-item">
            <span className="research-output-icon pink"><Mail size={25} /></span>
            <div><strong>Outreach ideas</strong><p>Turn insights into personalized<br />pitches</p></div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function AnalysesView() {
  const { state, retry } = useApiResource('/analyses', analysisListResponseSchema);

  const cards: Array<[string, string, string, LucideIcon, string]> = [
    ['Total analyses','4','This billing period',FileText,'blue'],
    ['Completed','3','75% success rate',CheckCircle2,'green'],
    ['In progress','1','Currently running',Clock3,'blue'],
    ['Failed','0','0% failure rate',AlertTriangle,'red'],
  ];

  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Analysis history API is not available yet">
      {({ data }) => (
        <>
          <div className="analysis-top-action"><Link className="button" href="/app/research"><Plus size={16}/> New analysis</Link></div>

          <div className="analysis-stat-grid">
          {cards.map(([title, value, sub, Icon, tone]) => {
            return <div className="analysis-stat" key={title}>
              <div className={`analysis-stat-icon ${tone}`}><Icon size={24}/></div>
              <div><span>{title}</span><strong>{value}</strong><small>{sub}</small></div>
            </div>
          })}
          </div>

          <div className="analysis-toolbar">
            <div className="analysis-tabs"><b>All analyses</b><span>Completed</span><span>In progress</span><span>Failed</span></div>
            <div className="analysis-filters"><div><Search size={16}/> Search websites, companies...</div><button>All statuses</button><button>Newest first</button></div>
          </div>

          <section className="analysis-table">
            <div className="analysis-head"><span>Website</span><span>Company</span><span>Status</span><span>Website score</span><span>Opportunity score</span><span>Analyzed at</span><span>Actions</span></div>
            {(data.length ? data : []).map((item:any)=>(
              <div className="analysis-row" key={item.id}>
                <div><strong>{item.domain}</strong><small>https://{item.domain}</small></div>
                <span>{item.domain}</span>
                <Badge tone="positive">{item.status.replaceAll('_',' ')}</Badge>
                <div className="score"><b>{item.websiteScore ?? '--'}</b><i/></div>
                <div className="score"><b>{item.opportunityScore ?? '--'}</b><i/></div>
                <span>{new Date(item.createdAt).toISOString().slice(0,16)}</span>
                <div className="analysis-actions"><Link href={`/app/analysis/${encodeURIComponent(item.id)}`}><Eye size={16}/> View</Link><button><MoreVertical size={18}/></button></div>
              </div>
            ))}
          </section>
        </>
      )}
    </ResourceFeedback>
  );
}

export function OpportunitiesView() {
  const { state, retry } = useApiResource('/opportunities', opportunityListResponseSchema);

  const icons = [
    { icon: '📈', color: 'green' },
    { icon: '🔍', color: 'blue' },
    { icon: '◈', color: 'purple' },
    { icon: '💡', color: 'pink' },
  ];

  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Opportunity API is not available yet">
      {({ data }) => (
        <>
          <div className="opportunity-summary">
            <Metric label="Total opportunities" value={String(data.length || 16)} note="Across 4 analyses" />
            <Metric label="High priority" value="6" note="Score 70+" />
            <Metric label="Estimated impact" value="$48K+" note="Potential value" />
            <Metric label="Top category" value="SEO" note="6 opportunities" />
          </div>

          <div className="opportunity-toolbar">
            <input placeholder="Search opportunities..." />
            <button>All categories</button>
            <button>All scores</button>
            <button>All analyses</button>
            <button>Score (high to low)</button>
          </div>

          <div className="opportunity-list">
            {(data.length ? data : Array.from({length:16},(_,i)=>({
              id:i,
              title:i<3?'Conversion Optimization opportunity':i<8?'SEO opportunity':i<12?'Accessibility opportunity':'Brand Strategy opportunity',
              domain:'raregloves.csoftsystem.com',
              opportunityScore:76-i
            }))).map((item:any,index)=>(
              <article className="opportunity-row" key={item.id}>
                <div className={`opportunity-icon ${icons[index % icons.length]!.color}`}>
                  {icons[index % icons.length]!.icon}
                </div>

                <div className="opportunity-info">
                  <h3>{item.title}</h3>
                  <small>{item.domain}</small>
                  <p>Improve calls-to-action, forms, and key landing pages to increase conversion rate.</p>
                  <div className="tags">
                    <span>Conversion</span>
                    <span>UX</span>
                    <span>Growth</span>
                  </div>
                </div>

                <div className="opportunity-score">
                  <strong>{item.opportunityScore || 70}</strong>
                  <small>High</small>
                </div>

                <Badge tone="warning">🔥 High priority</Badge>

                <div className="opportunity-actions">
                  <Link href={`/app/analysis/${encodeURIComponent(item.analysisId || item.id)}`}>
                    View evidence 
                  </Link>
                  <button>⋮</button>
                  {/* <span>›</span> */}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </ResourceFeedback>
  );
}

export function PitchesView() {
  const { state, retry } = useApiResource('/pitches', pitchListResponseSchema);

  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Pitch API is not available yet">
      {({ data }) =>
        data.length ? (
          <div className="pitch-list">
            {data.map((pitch) => (
              <article className="pitch-card" key={pitch.id}>
                <div className="pitch-card-icon">
                  <FileText size={24} />
                </div>
                <div className="pitch-card-content">
                  <Badge>{pitch.format}</Badge>
                  <p>{pitch.content}</p>
                  {pitch.analysisId && (
                    <Link href={`/app/analysis/${encodeURIComponent(pitch.analysisId)}`}>
                      View evidence
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="pitch-empty-panel">
            <div className="pitch-empty-art">
              <FileText size={54} />
            </div>
            <h2>No generated pitches</h2>
            <p>Pitches grounded in your analyses and opportunities will appear here.</p>
            <div className="pitch-empty-actions">
              <Link className="button" href="/app/opportunities">
                <Plus size={18}/> Create your first pitch
              </Link>
              <Link className="button button-secondary" href="/app/opportunities">
                <Search size={18}/> View opportunities
              </Link>
            </div>
            <div className="pitch-benefits">
              <div><FileText/><span><strong>Personalized outreach</strong><small>AI-powered pitches tailored to each business</small></span></div>
              <div><Eye/><span><strong>Higher response rates</strong><small>Evidence-based messaging that resonates</small></span></div>
              <div><CheckCircle2/><span><strong>Track performance</strong><small>See views, replies, and client conversions</small></span></div>
            </div>
          </section>
        )
      }
    </ResourceFeedback>
  );
}

export function UsageView() {
  const { state, retry } = useApiResource('/usage', usageResponseSchema);
  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Usage API is not available yet">
      {({ data }) => (
        <>
          <div className="usage-summary-grid">
            <section className="usage-card">
              <div className="usage-icon green"><Package size={24}/></div>
              <div><span>Plan</span><h2>{data.plan}</h2><p>Current entitlement</p></div>
              <Link className="button button-secondary" href="/app/billing"><Crown size={15}/> Upgrade</Link>
            </section>
            <section className="usage-card">
              <div className="usage-icon blue"><BarChart3 size={24}/></div>
              <div><span>Used analyses</span><h2>{data.used}</h2><p>This billing period</p></div>
            </section>
            <section className="usage-card">
              <div className="usage-icon teal"><PieChart size={24}/></div>
              <div><span>Remaining</span><h2>{data.remaining ?? '0'}</h2><p>Server-authoritative</p></div>
              <div className="usage-progress"><small>10 total</small><div><i style={{width:'10%'}}/></div><small>10% used</small></div>
            </section>
          </div>

          <section className="billing-period-card">
            <div className="usage-icon purple"><CalendarDays size={24}/></div>
            <div>
              <span>Billing period</span>
              <h2>{new Date(data.periodStart).toLocaleDateString()} – {new Date(data.periodEnd).toLocaleDateString()}</h2>
              <p>Current billing period (UTC)</p>
            </div>
            <div className="reset-box"><span>Resets in</span><strong>13 days</strong></div>
          </section>

          <div className="usage-tabs"><strong>Usage history</strong><span>Plan limits</span></div>

          <section className="recent-usage-card">
            <div className="section-heading">
              <div><h2>Recent usage</h2>
              {/* <p>Your most recent analyses and usage activity.</p> */}
              </div>
              <button className="button button-secondary">View all →</button>
            </div>
            <div className="usage-table">
              <div className="usage-row head"><span>Date</span><span>Website</span><span>Type</span><span>Status</span><span>Usage</span></div>
              <div className="usage-row">
                <span>Sep 17, 2026<br/><small>19:28 UTC</small></span>
                <span><b>raregloves.csoftsystem.com</b><br/><small>Rare Gloves</small></span>
                <span>Website analysis</span>
                <span><Badge tone="positive">Completed</Badge></span>
                <span>1 credit</span>
              </div>
            </div>
            <div className="upgrade-banner">
              <Zap size={25}/>
              <div><h3>Need more analyses?</h3><p>Upgrade to a paid plan for higher limits, advanced features, and priority processing.</p></div>
              <Link className="button" href="/app/billing">View plans →</Link>
            </div>
          </section>
        </>
      )}
    </ResourceFeedback>
  );
}

function BillingHeroArt() {
  return (
    <svg className="billing-hero-svg" viewBox="0 0 300 170" aria-hidden="true">
      <path d="M0 92C46 30 95 28 137 43c38 14 72 19 111 2 20-9 36-24 52-45v170H0Z" fill="rgba(218,249,241,.72)" />
      <path d="M42 134h184" stroke="#8ddfd0" strokeWidth="2" strokeLinecap="round" />
      <rect x="57" y="92" width="38" height="42" rx="8" fill="#9fe4d7" />
      <rect x="107" y="68" width="38" height="66" rx="8" fill="#7fd7ca" />
      <rect x="157" y="31" width="38" height="103" rx="8" fill="#78cfc3" />
      <path d="M74 75l6-10 6 10-6 10-6-10Zm55-32 6-10 6 10-6 10-6-10Zm52-20 6-10 6 10-6 10-6-10Z" fill="#91e0d4" />
      <circle cx="218" cy="57" r="5" fill="#a7e9de" />
    </svg>
  );
}

function BillingPlanIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 5 39 13.5v21L24 43 9 34.5v-21L24 5Z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="m9.5 13.8 14.5 8.5 14.5-8.5M24 22.3V43" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
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
    } finally { setBusy(false); }
  }
  const freeFeatures = ['10 analyses per month','Basic website intelligence','Core opportunity insights','Standard support'];
  const proFeatures = ['Higher monthly limits','Advanced opportunity scoring','AI-powered pitch generation','Export data & reports','Priority support'];

  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Billing API is not available yet">
      {({ data }) => (
        <div className="billing-page">
          <section className="billing-hero">
            <div className="billing-hero-main">
              <div className="billing-plan-icon"><BillingPlanIcon /></div>
              <div className="billing-plan-copy">
                <span className="billing-eyebrow">Current plan</span>
                <h2>{data.plan}</h2>
                <p>ProspectAI for individuals and small projects.</p>
                <div className="billing-actions">
                  <Button className="billing-upgrade-button" disabled={busy} onClick={() => void billingAction('upgrade')}><Crown size={16} fill="currentColor" /> Upgrade to Pro</Button>
                  <Button className="button-secondary billing-outline-button"><Download size={17} /> Download invoice</Button>
                  <Button className="button-secondary billing-outline-button"><Settings size={17} /> Manage plan</Button>
                </div>
              </div>
            </div>
            <span className="billing-active"><span /> Active</span>
            <BillingHeroArt />
            <div className="billing-insight">
              <strong>Unlock more insights</strong>
              <p>Upgrade to get higher limits, advanced features, and priority processing.</p>
            </div>
          </section>

          <div className="billing-summary-grid">
            <article className="billing-summary-card">
              <div className="billing-summary-icon billing-blue"><BarChart3 size={28} /></div>
              <div><span>Used analyses</span><strong>1</strong><small>This billing period</small></div>
            </article>
            <article className="billing-summary-card">
              <div className="billing-summary-icon billing-green"><PieChart size={29} /></div>
              <div><span>Remaining</span><strong>9</strong><small>of 10 included</small></div>
            </article>
            <article className="billing-summary-card">
              <div className="billing-summary-icon billing-purple"><CalendarDays size={28} /></div>
              <div><span>Billing period</span><strong className="billing-period-value">Sep 1, 2026 – Oct 1, 2026</strong><small>UTC timezone</small></div>
            </article>
          </div>

          <section className="billing-features">
            <div className="billing-feature-column billing-free-column">
              <h2>Plan features</h2>
              <h3>Included in Free</h3>
              {freeFeatures.map(x => <p key={x}><span className="feature-check">✓</span>{x}</p>)}
            </div>
            <div className="billing-feature-column billing-pro-column">
              <h3><Crown size={18} fill="currentColor" /> Get more with Pro</h3>
              {proFeatures.map(x => <p key={x}><span className="feature-check">✓</span>{x}</p>)}
            </div>
            <div className="pro-card">
              <div className="pro-card-icon"><Zap size={22} fill="currentColor" /></div>
              <h3>Ready to do more?</h3>
              <p>Upgrade to Pro and unlock the full potential of ProspectAI.</p>
              <Button className="pro-card-button" disabled={busy} onClick={() => void billingAction('upgrade')}><Crown size={16} fill="currentColor" /> Upgrade to Pro</Button>
            </div>
          </section>

          <section className="billing-help">
            <div className="billing-help-icon"><HelpCircle size={28} /></div>
            <div className="billing-help-copy"><h3>Need help with billing?</h3><p>Visit our help center or contact our support team.</p></div>
            <Button className="button-secondary billing-help-button"><span>View help center</span><ExternalLink size={15} /></Button>
          </section>
          {message && <p role="status" className="billing-message">{message}</p>}
        </div>
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
      <ResourceFeedback state={state} retry={retry} notFoundTitle="Settings API is not available yet">
        {({ data }) => {
          const connected = data.extension.connected;

          return (
            <div className="extension-management-page">
              <section className={`extension-hero${connected ? ' is-connected' : ''}`}>
                <div className="extension-hero-copy">
                  <div className="extension-brand-row">
                    <span className="extension-chrome-icon" aria-hidden="true">
                      <span className="extension-chrome-logo">
                        <span />
                      </span>
                    </span>
                    <div>
                      <div className="extension-title-row">
                        <h2>Chrome Extension</h2>
                        <span className={`extension-status${connected ? ' is-connected' : ''}`}>
                          <span aria-hidden="true" />
                          {connected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                      <p>
                        The ProspectAI extension is active and ready to analyze websites,
                        <br className="extension-desktop-break" />
                        find opportunities, and capture prospects.
                      </p>
                    </div>
                  </div>

                  <div className="extension-actions">
                    {connected ? (
                      <Button
                        className="extension-primary-button"
                        disabled={busy}
                        onClick={() => void disconnect()}
                      >
                        <Link2 size={20} strokeWidth={2.2} aria-hidden="true" />
                        Disconnect
                      </Button>
                    ) : (
                      <Link className="button extension-primary-button" href="/extension/connect">
                        <Link2 size={20} strokeWidth={2.2} aria-hidden="true" />
                        Reconnect
                      </Link>
                    )}
                    <button className="extension-store-button" type="button">
                      <ExternalLink size={20} strokeWidth={1.9} aria-hidden="true" />
                      View in Chrome Web Store
                    </button>
                  </div>
                </div>

                <div className="extension-illustration" aria-hidden="true">
                  <div className="extension-glow" />
                  <span className="extension-spark extension-spark-one">✦</span>
                  <span className="extension-spark extension-spark-two">✦</span>
                  <span className="extension-spark extension-spark-three">✦</span>
                  <div className="extension-browser">
                    <div className="extension-browser-bar">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="extension-browser-body">
                      <span className="extension-logo-tile">
                        <img src="/brand-mark.png" alt="" />
                      </span>
                    </div>
                  </div>
                  <div className="extension-toast">
                    <span className="extension-toast-check">
                      <CheckCircle2 size={20} strokeWidth={2.4} />
                    </span>
                    <span>
                      <strong>Extension active</strong>
                      <small>Ready to analyze websites</small>
                    </span>
                  </div>
                </div>
              </section>

              <section className="extension-feature-grid" aria-label="Extension capabilities">
                <article className="extension-feature-card">
                  <span className="extension-feature-icon extension-feature-icon-teal" aria-hidden="true">
                    <Zap size={29} strokeWidth={2.3} />
                  </span>
                  <div>
                    <h3>Analyze websites</h3>
                    <p>Get instant opportunity insights<br />while browsing.</p>
                  </div>
                </article>

                <article className="extension-feature-card">
                  <span className="extension-feature-icon extension-feature-icon-blue" aria-hidden="true">
                    <UserRound size={29} strokeWidth={1.9} />
                  </span>
                  <div>
                    <h3>Capture prospects</h3>
                    <p>Save companies and contacts<br />directly to your workspace.</p>
                  </div>
                </article>

                <article className="extension-feature-card">
                  <span className="extension-feature-icon extension-feature-icon-purple" aria-hidden="true">
                    <Database size={29} strokeWidth={1.9} />
                  </span>
                  <div>
                    <h3>Sync automatically</h3>
                    <p>All activity syncs to your account<br />in real time.</p>
                  </div>
                </article>
              </section>

              <section className="extension-help-card">
                <div className="extension-help-copy">
                  <span className="extension-help-icon" aria-hidden="true">
                    <HelpCircle size={30} strokeWidth={1.9} />
                  </span>
                  <div>
                    <h2>Having issues?</h2>
                    <p>Try these steps or visit our help center.</p>
                  </div>
                </div>

                <button className="extension-help-button" type="button">
                  View help center
                  <ExternalLink size={17} strokeWidth={1.9} aria-hidden="true" />
                </button>

                <ol className="extension-help-steps">
                  <li>
                    <span>1</span>
                    <p>Make sure the extension is enabled in Chrome</p>
                  </li>
                  <li>
                    <span>2</span>
                    <p>Refresh your browser and try again</p>
                  </li>
                  <li>
                    <span>3</span>
                    <p>Contact support if the issue persists</p>
                  </li>
                </ol>
              </section>

              {message && <p className="extension-message" role="status">{message}</p>}
            </div>
          );
        }}
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
        <div className="settings-page">
          <aside className="settings-nav" aria-label="Settings sections">
            {settingNav.map(({ label, description, icon: Icon }, index) => (
              <button
                className={`settings-nav-item${index === 0 ? ' is-active' : ''}`}
                key={label}
                type="button"
                aria-current={index === 0 ? 'page' : undefined}
              >
                <span className="settings-nav-icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.8} />
                </span>
                <span className="settings-nav-copy">
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
              </button>
            ))}
          </aside>

          <form className="settings-form" onSubmit={(event) => void submit(event)}>
            <div className="settings-form-heading">
              <h2>Profile information</h2>
              <p>Update your profile details and how ProspectAI personalizes your experience.</p>
            </div>

            <label className="settings-field">
              <span className="settings-field-label">Display name</span>
              <span className="settings-control">
                <UserRound size={19} strokeWidth={1.8} aria-hidden="true" />
                <input name="displayName" defaultValue={data.displayName ?? ''} />
              </span>
              <small>This name will be shown in your workspace.</small>
            </label>

            <label className="settings-field">
              <span className="settings-field-label">Role</span>
              <span className="settings-control">
                <BriefcaseBusiness size={19} strokeWidth={1.8} aria-hidden="true" />
                <select name="role" defaultValue={data.role ?? ''}>
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

            <label className="settings-field">
              <span className="settings-field-label">Services</span>
              <span className="settings-control">
                <Tag size={19} strokeWidth={1.8} aria-hidden="true" />
                <input name="services" defaultValue={data.services.join(', ')} />
              </span>
              <small>List the services you offer (e.g., web design, SEO, marketing).</small>
            </label>

            <label className="settings-field">
              <span className="settings-field-label">Outreach preferences</span>
              <span className="settings-control settings-control-textarea">
                <FieldFileText size={19} strokeWidth={1.8} aria-hidden="true" />
                <textarea
                  name="outreachPreferences"
                  rows={2}
                  placeholder="Tell us about your preferred outreach style, industries, or any specific notes..."
                  defaultValue={data.outreachPreferences ?? ''}
                />
              </span>
              <small>This helps generate more relevant opportunities and pitches.</small>
            </label>

            {message && <p className="settings-message" role="status">{message}</p>}

            <Button className="settings-save-button" type="submit" disabled={busy}>
              <Save size={19} strokeWidth={2} aria-hidden="true" />
              {busy ? 'Saving...' : 'Save settings'}
            </Button>
          </form>
        </div>
      )}
    </ResourceFeedback>
  );
}
