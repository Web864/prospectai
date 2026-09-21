'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { FileText, CheckCircle2, Clock3, AlertTriangle, Search, Eye, MoreVertical, Plus, CalendarDays, Crown, Zap, BarChart3, Package, PieChart, type LucideIcon } from 'lucide-react';
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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.busy) return;
    const url = String(new FormData(event.currentTarget).get('url') ?? '');
    setStatus({ busy: true, message: '' });
    try {
      const result = await webApiRequest('/analyses', analysisAcceptedResponseSchema, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ url }),
      });
      window.location.assign(`/app/analysis/pending?job=${encodeURIComponent(result.data.jobId)}`);
    } catch (error) {
      setStatus({
        busy: false,
        message: error instanceof ApiClientError ? error.message : 'Analysis could not start.',
      });
    }
  }
  return (
    <form className="form-panel" onSubmit={(event) => void submit(event)}>
      <label className="field">
        Company website
        <input name="url" type="url" inputMode="url" required placeholder="https://company.com" />
      </label>
      {status.message && (
        <p className="form-message form-message-error" role="alert">
          {status.message}
        </p>
      )}
      <Button type="submit" disabled={status.busy}>
        {status.busy ? 'Starting analysis...' : 'Analyze website'}
      </Button>
    </form>
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
            <div className="analysis-filters"><div><Search size={16}/> Search websites, companies...</div><button>All statuses⌄</button><button>Newest first⌄</button></div>
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
            <button>All categories⌄</button>
            <button>All scores⌄</button>
            <button>All analyses⌄</button>
            <button>Score (high to low)⌄</button>
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
                    View evidence →
                  </Link>
                  <button>⋮</button>
                  <span>›</span>
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
              <div><h2>Recent usage</h2><p>Your most recent analyses and usage activity.</p></div>
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
  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Billing API is not available yet">
      {({ data }) => (
        <div className="billing-page">
          <section className="billing-hero">
            <div className="billing-plan-icon"><Package size={28}/></div>
            <div className="billing-plan-copy"><span>Current plan</span><h2>{data.plan}</h2><p>ProspectAI for individuals and small projects.</p>
              <div className="actions"><Button disabled={busy} onClick={() => void billingAction('upgrade')}><Crown size={16}/> Upgrade to Pro</Button><Button className="button-secondary">Download invoice</Button><Button className="button-secondary">Manage plan</Button></div>
            </div>
            <Badge tone="positive">Active</Badge>
            <div className="billing-insight"><strong>Unlock more insights</strong><p>Upgrade to get higher limits, advanced features, and priority processing.</p></div>
          </section>

          <div className="billing-summary-grid">
            <Metric icon={BarChart3} label="Used analyses" value="1" helper="This billing period" />
            <Metric icon={PieChart} label="Remaining" value="9" helper="of 10 included" />
            <Metric icon={CalendarDays} label="Billing period" value="Sep 1, 2026 – Oct 1, 2026" helper="UTC timezone" />
          </div>

          <section className="billing-features">
            <div><h2>Plan features</h2><h3>Included in Free</h3>{['10 analyses per month','Basic website intelligence','Core opportunity insights','Standard support'].map(x=><p key={x}>✓ {x}</p>)}</div>
            <div className="pro-features"><h3>👑 Get more with Pro</h3>{['Higher monthly limits','Advanced opportunity scoring','AI-powered pitch generation','Export data & reports','Priority support'].map(x=><p key={x}>✓ {x}</p>)}</div>
            <div className="pro-card"><Zap size={22}/><h3>Ready to do more?</h3><p>Upgrade to Pro and unlock the full potential of ProspectAI.</p><Button>Upgrade to Pro</Button></div>
          </section>
          <section className="billing-help"><h3>Need help with billing?</h3><p>Visit our help center or contact our support team.</p><Button className="button-secondary">View help center ↗</Button></section>
          {message && <p role="status">{message}</p>}
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
  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Settings API is not available yet">
      {({ data }) =>
        extensionOnly ? (
          <section className="settings-section">
            <div className="status-row">
              <div>
                <h2>Chrome Extension</h2>
                <p className="muted">{data.extension.status}</p>
              </div>
              <Badge tone={data.extension.connected ? 'positive' : 'warning'}>
                {data.extension.connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            {data.extension.connected ? (
              <Button disabled={busy} onClick={() => void disconnect()}>
                Disconnect
              </Button>
            ) : (
              <Link className="button" href="/extension/connect">
                Reconnect
              </Link>
            )}
            {message && <p role="status">{message}</p>}
          </section>
        ) : (
          <form className="form-panel" onSubmit={(event) => void submit(event)}>
            <label className="field">
              Display name
              <input name="displayName" defaultValue={data.displayName ?? ''} />
            </label>
            <label className="field">
              Role
              <input name="role" defaultValue={data.role ?? ''} />
            </label>
            <label className="field">
              Services
              <input name="services" defaultValue={data.services.join(', ')} />
            </label>
            <label className="field">
              Outreach preferences
              <textarea
                name="outreachPreferences"
                rows={4}
                defaultValue={data.outreachPreferences ?? ''}
              />
            </label>
            {message && <p role="status">{message}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving...' : 'Save settings'}
            </Button>
          </form>
        )
      }
    </ResourceFeedback>
  );
}
