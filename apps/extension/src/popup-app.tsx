import { useCallback, useEffect, useRef, useState } from 'react';
import {
  analysisAcceptedResponseSchema,
  analysisDetailResponseSchema,
  analysisJobProgressResponseSchema,
  guestAnalysisAcceptedResponseSchema,
  guestAnalysisResultResponseSchema,
  guestSessionResponseSchema,
  usageResponseSchema,
} from '@prospectai/validation';
import { apiRequest } from './api-client';
import { appLink, readApiError } from './api-envelope';
import { APP_URL } from './config';
import {
  type ActiveAnalysis,
  analysisSubmissionKey,
  clearActiveAnalysis,
  clearSubmissionKey,
  isRunning,
  patchActiveAnalysis,
  readActiveAnalysis,
  withSubmissionLock,
  writeActiveAnalysis,
} from './job-store';
import { detectPage, type PageDetection, unsupportedCopy } from './page-detection';
import { createOpaqueToken } from './pkce';
import { AUTH_FLOW_KEY, type AuthFlow } from './service-worker-contract';
import {
  isTerminalStatus,
  isTransient,
  type Notice,
  notice,
  noticeFromApi,
  noticeFromJobFailure,
  noticeFromRequestError,
} from './state-model';
import {
  ExternalLink,
  GuestResultView,
  type GuestResult,
  type JobProgress,
  ProgressPanel,
  type RegisteredActions,
  RegisteredResultView,
  type RegisteredResult,
  Spinner,
} from './views';
import brandIconUrl from './icons/icon-48.png';
import './popup.css';

type GuestSession = typeof guestSessionResponseSchema._output.data;
type Usage = typeof usageResponseSchema._output.data;
type SessionKind = 'registered' | 'guest' | 'expired';
type RetryTarget = 'submit' | 'job' | 'boot';

type View =
  | { name: 'detecting' }
  | { name: 'unsupported' }
  | { name: 'ready' }
  | { name: 'submitting' }
  | {
      name: 'analyzing';
      record: ActiveAnalysis;
      job?: JobProgress | undefined;
      reconnecting?: string | undefined;
    }
  | {
      name: 'result';
      record?: ActiveAnalysis | undefined;
      registered?: RegisteredResult;
      guest?: GuestResult;
    }
  | { name: 'notice'; notice: Notice; retry: RetryTarget; record?: ActiveAnalysis | undefined }
  | { name: 'guest_limit' }
  | { name: 'auth_pending'; startedAt: string };

const AUTH_STALE_MS = 10 * 60_000;
const MAX_TRANSIENT_FAILURES = 6;
const idleSave: RegisteredActions['save'] = { status: 'idle' };
const idlePitch: RegisteredActions['pitch'] = { status: 'idle' };

function storedTheme(value: unknown) {
  return value === 'dark' || value === 'light' ? value : undefined;
}

export function PopupApp() {
  const [page, setPage] = useState<PageDetection>();
  const [view, setView] = useState<View>({ name: 'detecting' });
  const [session, setSession] = useState<SessionKind>('guest');
  const [guest, setGuest] = useState<GuestSession>();
  const [usage, setUsage] = useState<Usage>();
  const [now, setNow] = useState(() => Date.now());
  const [theme, setTheme] = useState<'light' | 'dark' | undefined>();
  const [save, setSave] = useState(idleSave);
  const [pitch, setPitch] = useState(idlePitch);
  const [copied, setCopied] = useState(false);
  const [pdf, setPdf] = useState<'idle' | 'working' | 'failed'>('idle');
  const [signedInBanner, setSignedInBanner] = useState(false);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  );

  const sessionRef = useRef<SessionKind>('guest');
  const pageRef = useRef<PageDetection | undefined>(undefined);
  const busyRef = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const failuresRef = useRef(0);
  const pollingJobRef = useRef<string | undefined>(undefined);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(true);

  const updateSession = (kind: SessionKind) => {
    sessionRef.current = kind;
    setSession(kind);
  };
  const show = useCallback((next: View) => {
    if (mounted.current) setView(next);
  }, []);
  const stopPolling = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = undefined;
    pollingJobRef.current = undefined;
  };

  // ---------- Result loading ----------
  const loadResult = async (analysisId: string, record?: ActiveAnalysis) => {
    const registered = sessionRef.current === 'registered';
    const response = await apiRequest(
      registered
        ? `/analyses/${encodeURIComponent(analysisId)}`
        : `/guest-analyses/${encodeURIComponent(analysisId)}`,
    );
    if (!response.ok) {
      const { code } = await readApiError(response);
      const failure =
        code === 'ANALYSIS_UNAVAILABLE'
          ? notice('result_missing')
          : noticeFromApi(response.status, code);
      if (failure.kind === 'result_missing' && record) await clearActiveAnalysis(record.jobId);
      return show({ name: 'notice', notice: failure, retry: 'job', record });
    }
    const body: unknown = await response.json().catch(() => null);
    // Only a COMPLETED or PARTIAL analysis is a result. A preserved guest analysis that failed
    // (or is still queued) must never be presented as a finished report.
    const status = (body as { data?: { status?: unknown } } | null)?.data?.status;
    if (status !== 'completed' && status !== 'partial') {
      if (record) {
        await clearActiveAnalysis(record.jobId);
        return show({ name: 'notice', notice: notice('result_missing'), retry: 'boot' });
      }
      return enterReady();
    }
    setSave(idleSave);
    setPdf('idle');
    if (registered) {
      const parsed = analysisDetailResponseSchema.safeParse(body);
      if (!parsed.success)
        return show({ name: 'notice', notice: notice('invalid_response'), retry: 'job', record });
      const existingPitch = parsed.data.data.pitches[0];
      setPitch(existingPitch ? { status: 'ready', content: existingPitch.content } : idlePitch);
      show({ name: 'result', record, registered: parsed.data.data });
      void refreshUsage();
    } else {
      const parsed = guestAnalysisResultResponseSchema.safeParse(body);
      if (!parsed.success)
        return show({ name: 'notice', notice: notice('invalid_response'), retry: 'job', record });
      show({ name: 'result', record, guest: parsed.data.data });
      void refreshGuest();
    }
    if (record) await patchActiveAnalysis(record.jobId, { seen: true });
  };

  // ---------- Job polling (only while the popup is open; the worker keeps the badge honest) ----------
  const poll = async (record: ActiveAnalysis): Promise<void> => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollingJobRef.current = record.jobId;
    const retryLater = (failure: Notice) => {
      failuresRef.current += 1;
      if (failuresRef.current > MAX_TRANSIENT_FAILURES) {
        pollingJobRef.current = undefined;
        return show({
          name: 'notice',
          notice: { ...failure, action: 'resume', keepsJob: true },
          retry: 'job',
          record,
        });
      }
      setView((current) =>
        current.name === 'analyzing' && current.record.jobId === record.jobId
          ? { ...current, reconnecting: failure.title }
          : { name: 'analyzing', record, reconnecting: failure.title },
      );
      const delay = Math.min(1_500 * 2 ** failuresRef.current, 15_000);
      pollTimer.current = setTimeout(() => void poll(record), delay);
    };
    try {
      const response = await apiRequest(`/analysis-jobs/${encodeURIComponent(record.jobId)}`);
      if (!mounted.current || pollingJobRef.current !== record.jobId) return;
      if (!response.ok) {
        const { code } = await readApiError(response);
        const failure = noticeFromApi(response.status, code);
        if (failure.kind === 'result_missing') {
          await clearActiveAnalysis(record.jobId);
          pollingJobRef.current = undefined;
          return show({ name: 'notice', notice: failure, retry: 'boot' });
        }
        if (isTransient(failure.kind)) return retryLater(failure);
        pollingJobRef.current = undefined;
        return show({
          name: 'notice',
          notice: { ...failure, keepsJob: true },
          retry: 'job',
          record,
        });
      }
      const parsed = analysisJobProgressResponseSchema.safeParse(
        await response.json().catch(() => null),
      );
      if (!parsed.success) return retryLater(notice('invalid_response'));
      failuresRef.current = 0;
      const job = parsed.data.data;
      const next = (await patchActiveAnalysis(record.jobId, {
        status: job.status,
        analysisId: job.analysisId,
      })) ?? { ...record, status: job.status, analysisId: job.analysisId };
      if (isTerminalStatus(job.status)) {
        pollingJobRef.current = undefined;
        if (job.status === 'completed' || job.status === 'partial')
          return loadResult(job.analysisId, next);
        await patchActiveAnalysis(record.jobId, { seen: true });
        if (sessionRef.current === 'guest') void refreshGuest();
        return show({
          name: 'notice',
          notice: noticeFromJobFailure(job.status, job.errorCode),
          retry: 'submit',
          record: next,
        });
      }
      show({ name: 'analyzing', record: next, job });
      const age = Date.now() - Date.parse(record.submittedAt);
      pollTimer.current = setTimeout(() => void poll(next), age < 60_000 ? 1_500 : 3_000);
    } catch (error) {
      if (!mounted.current || pollingJobRef.current !== record.jobId) return;
      retryLater(noticeFromRequestError(error, navigator.onLine));
    }
  };

  // ---------- Session state ----------
  const refreshGuest = async () => {
    const response = await apiRequest('/guest-sessions', { method: 'POST' });
    if (!response.ok) return undefined;
    const parsed = guestSessionResponseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) return undefined;
    setGuest(parsed.data.data);
    await chrome.storage.local.set({ guestSessionId: parsed.data.data.sessionId });
    return parsed.data.data;
  };
  const refreshUsage = async () => {
    const response = await apiRequest('/usage').catch(() => undefined);
    if (!response?.ok) return undefined;
    const parsed = usageResponseSchema.safeParse(await response.json().catch(() => null));
    if (parsed.success) setUsage(parsed.data.data);
    return parsed.success ? parsed.data.data : undefined;
  };

  /** Shows the right entry screen for the current page and session (no job involved). */
  const enterReady = async () => {
    const detected = pageRef.current;
    if (!detected?.supported) return show({ name: 'unsupported' });
    if (sessionRef.current === 'expired')
      return show({ name: 'notice', notice: notice('session_expired'), retry: 'boot' });
    if (sessionRef.current === 'registered') {
      show({ name: 'ready' });
      const current = await refreshUsage();
      if (current?.quotaReached)
        show({ name: 'notice', notice: notice('quota_exhausted'), retry: 'boot' });
      return;
    }
    const { guestToken } = await chrome.storage.local.get('guestToken');
    if (typeof guestToken !== 'string')
      await chrome.storage.local.set({ guestToken: createOpaqueToken() });
    const response = await apiRequest('/guest-sessions', { method: 'POST' });
    if (!response.ok) {
      const { code } = await readApiError(response);
      return show({ name: 'notice', notice: noticeFromApi(response.status, code), retry: 'boot' });
    }
    const parsed = guestSessionResponseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success)
      return show({ name: 'notice', notice: notice('invalid_response'), retry: 'boot' });
    setGuest(parsed.data.data);
    await chrome.storage.local.set({ guestSessionId: parsed.data.data.sessionId });
    show(parsed.data.data.quotaReached ? { name: 'guest_limit' } : { name: 'ready' });
  };

  const boot = async () => {
    stopPolling();
    failuresRef.current = 0;
    const [tabs, local, sessionArea] = await Promise.all([
      chrome.tabs.query({ active: true, lastFocusedWindow: true }),
      chrome.storage.local.get([
        'accessToken',
        'sessionState',
        'guestToken',
        'guestSessionId',
        'lastConvertedAnalysisId',
        'theme',
      ]),
      chrome.storage.session.get(AUTH_FLOW_KEY),
    ]);
    if (!mounted.current) return;
    const detected = detectPage(tabs[0]?.url);
    pageRef.current = detected;
    setPage(detected);
    updateSession(
      typeof local.accessToken === 'string'
        ? 'registered'
        : local.sessionState === 'expired'
          ? 'expired'
          : 'guest',
    );

    const flow = sessionArea[AUTH_FLOW_KEY] as AuthFlow | undefined;
    if (flow?.status === 'pending' && Date.now() - Date.parse(flow.startedAt) < AUTH_STALE_MS)
      return show({ name: 'auth_pending', startedAt: flow.startedAt });
    if (flow && flow.status !== 'pending') {
      await chrome.storage.session.remove(AUTH_FLOW_KEY);
      if (flow.status === 'failed')
        return show({
          name: 'notice',
          notice: notice(flow.reason === 'cancelled' ? 'sign_in_cancelled' : 'sign_in_failed'),
          retry: 'boot',
        });
      setSignedInBanner(true);
    }
    // A guest who signed in while offline still has guest keys: finish the conversion now.
    if (sessionRef.current === 'registered' && typeof local.guestToken === 'string')
      await chrome.runtime.sendMessage({ type: 'convert-guest' }).catch(() => undefined);

    const record = await readActiveAnalysis();
    if (record && (isRunning(record) || !record.seen)) {
      show({ name: 'analyzing', record });
      return poll(record);
    }
    const { lastConvertedAnalysisId } = await chrome.storage.local.get('lastConvertedAnalysisId');
    if (sessionRef.current === 'registered' && typeof lastConvertedAnalysisId === 'string') {
      await chrome.storage.local.remove('lastConvertedAnalysisId');
      return loadResult(lastConvertedAnalysisId);
    }
    return enterReady();
  };

  const safely = (work: () => Promise<unknown>, retry: RetryTarget) => {
    void work().catch((error: unknown) =>
      show({ name: 'notice', notice: noticeFromRequestError(error, navigator.onLine), retry }),
    );
  };

  // ---------- Submission ----------
  const analyze = async () => {
    const detected = pageRef.current;
    if (busyRef.current || !detected?.supported) return;
    busyRef.current = true;
    show({ name: 'submitting' });
    try {
      const record = await withSubmissionLock(
        async (): Promise<ActiveAnalysis | Notice | 'limit'> => {
          // Another popup (or an earlier click) already has a job in flight: resume, never resubmit.
          const existing = await readActiveAnalysis();
          if (existing && isRunning(existing)) return existing;
          const mode = sessionRef.current === 'registered' ? 'registered' : 'guest';
          const key = await analysisSubmissionKey(mode, detected.url);
          const response = await apiRequest(
            mode === 'registered' ? '/analyses' : '/guest-analyses',
            {
              method: 'POST',
              headers: { 'Idempotency-Key': key },
              body: JSON.stringify({ url: detected.url }),
            },
          );
          if (!response.ok) {
            const { code } = await readApiError(response);
            // A definitive refusal created no job; a fresh key is correct for the next attempt.
            if (response.status < 500 && response.status !== 408 && code !== 'RATE_LIMITED')
              await clearSubmissionKey();
            if (code === 'GUEST_TRIAL_EXHAUSTED') return 'limit';
            return noticeFromApi(response.status, code);
          }
          const body: unknown = await response.json().catch(() => null);
          let accepted: { jobId: string; analysisId?: string | undefined } | undefined;
          if (mode === 'guest') {
            const parsed = guestAnalysisAcceptedResponseSchema.safeParse(body);
            if (parsed.success) {
              accepted = parsed.data.data;
              setGuest(parsed.data.data.entitlement);
            }
          } else {
            const parsed = analysisAcceptedResponseSchema.safeParse(body);
            if (parsed.success) accepted = parsed.data.data;
          }
          if (!accepted) return notice('invalid_response');
          const next: ActiveAnalysis = {
            jobId: accepted.jobId,
            ...(accepted.analysisId ? { analysisId: accepted.analysisId } : {}),
            mode,
            url: detected.url,
            domain: detected.domain,
            submittedAt: new Date().toISOString(),
            status: 'queued',
          };
          await writeActiveAnalysis(next);
          await clearSubmissionKey();
          return next;
        },
      );
      if (record === 'limit') {
        void refreshGuest();
        return show({ name: 'guest_limit' });
      }
      if ('kind' in record) return show({ name: 'notice', notice: record, retry: 'submit' });
      if (sessionRef.current === 'guest')
        await chrome.storage.local.set({ privacyAcknowledged: true });
      show({ name: 'analyzing', record });
      await poll(record);
    } catch (error) {
      // The request may have reached the server; the stored idempotency key makes "Try again" safe.
      show({
        name: 'notice',
        notice: noticeFromRequestError(error, navigator.onLine),
        retry: 'submit',
      });
    } finally {
      busyRef.current = false;
    }
  };

  // ---------- Account ----------
  const startSignIn = async (provider: 'google' | 'account') => {
    show({ name: 'auth_pending', startedAt: new Date().toISOString() });
    const response = (await chrome.runtime
      .sendMessage({ type: 'start-sign-in', provider })
      .catch(() => undefined)) as { started?: boolean } | undefined;
    if (!response?.started)
      show({ name: 'notice', notice: notice('sign_in_failed'), retry: 'boot' });
  };
  const signOut = async () => {
    stopPolling();
    show({ name: 'detecting' });
    await chrome.runtime.sendMessage({ type: 'sign-out' }).catch(() => undefined);
    setUsage(undefined);
    setGuest(undefined);
    setSignedInBanner(false);
    await boot();
  };
  const continueAsGuest = async () => {
    await chrome.storage.local.remove('sessionState');
    updateSession('guest');
    await enterReady();
  };

  // ---------- Result actions ----------
  const saveProspect = async (result: RegisteredResult) => {
    setSave({ status: 'working' });
    try {
      const response = await apiRequest('/leads', {
        method: 'POST',
        body: JSON.stringify({ analysisId: result.id, name: result.companyName ?? result.domain }),
      });
      const body: unknown = await response
        .clone()
        .json()
        .catch(() => null);
      if (response.status === 201) {
        const id = (body as { data?: { id?: unknown } } | null)?.data?.id;
        return setSave({
          status: 'saved',
          ...(typeof id === 'string' ? { leadUrl: appLink(APP_URL, '/app/leads/', id) } : {}),
        });
      }
      const { code, details } = await readApiError(response);
      if (response.status === 409 && typeof details.leadId === 'string')
        return setSave({
          status: 'exists',
          leadUrl: appLink(APP_URL, '/app/leads/', details.leadId),
        });
      setSave({
        status: 'failed',
        message: noticeFromApi(response.status, code).title + '. The prospect was not saved.',
      });
    } catch (error) {
      setSave({
        status: 'failed',
        message:
          noticeFromRequestError(error, navigator.onLine).title + '. The prospect was not saved.',
      });
    }
  };
  const generatePitch = async (result: RegisteredResult) => {
    const opportunity = result.opportunities[0];
    if (!opportunity) return;
    setPitch({ status: 'working' });
    try {
      const response = await apiRequest('/pitches', {
        method: 'POST',
        body: JSON.stringify({
          analysisId: result.id,
          opportunityId: opportunity.id,
          format: 'cold_email',
        }),
      });
      if (response.ok) {
        const body = (await response.json().catch(() => null)) as {
          data?: { content?: unknown };
        } | null;
        if (typeof body?.data?.content === 'string')
          return setPitch({ status: 'ready', content: body.data.content });
        return setPitch({ status: 'failed', message: notice('invalid_response').title });
      }
      const { code } = await readApiError(response);
      setPitch({
        status: 'failed',
        message:
          code === 'AI_UNAVAILABLE'
            ? 'Pitch writing is unavailable right now because the AI service is not reachable. Your analysis is saved; try again later.'
            : noticeFromApi(response.status, code).title + '.',
      });
    } catch (error) {
      setPitch({
        status: 'failed',
        message: noticeFromRequestError(error, navigator.onLine).title + '.',
      });
    }
  };
  const copyPitch = async () => {
    if (pitch.content) await navigator.clipboard.writeText(pitch.content).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_500);
  };
  const downloadPdf = async (analysisId: string, domain: string) => {
    if (pdf === 'working') return;
    setPdf('working');
    try {
      const response = await apiRequest(
        `/analyses/${encodeURIComponent(analysisId)}/pdf`,
        {},
        { binary: true },
      );
      if (!response.ok) throw new Error('pdf');
      const href = URL.createObjectURL(
        new Blob([await response.blob()], { type: 'application/pdf' }),
      );
      const link = document.createElement('a');
      link.href = href;
      link.download = `ProspectAI-${domain.replace(/[^a-zA-Z0-9.-]/g, '-')}-analysis.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      setPdf('idle');
    } catch {
      setPdf('failed');
    }
  };
  const finishResult = async () => {
    const current = view;
    if ((current.name === 'result' || current.name === 'notice') && current.record)
      await clearActiveAnalysis(current.record.jobId);
    setPitch(idlePitch);
    setSave(idleSave);
    await enterReady();
  };

  const runNoticeAction = async (current: Extract<View, { name: 'notice' }>) => {
    const { action } = current.notice;
    if (action === 'sign_in') return startSignIn('account');
    if (action === 'create_account') return startSignIn('account');
    if (action === 'upgrade')
      return void chrome.tabs.create({ url: appLink(APP_URL, '/app/billing') });
    if (action === 'resume' && current.record) {
      failuresRef.current = 0;
      show({ name: 'analyzing', record: current.record });
      return poll(current.record);
    }
    if (action === 'analyze_again') {
      if (current.record) await clearActiveAnalysis(current.record.jobId);
      return analyze();
    }
    if (current.retry === 'job' && current.record) {
      failuresRef.current = 0;
      show({ name: 'analyzing', record: current.record });
      return poll(current.record);
    }
    if (current.retry === 'submit') return analyze();
    return boot();
  };

  // ---------- Lifecycle ----------
  useEffect(() => {
    mounted.current = true;
    void chrome.storage.local.get('theme').then(({ theme: value }) => setTheme(storedTheme(value)));
    safely(boot, 'boot');
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'session' && AUTH_FLOW_KEY in changes) {
        const flow = changes[AUTH_FLOW_KEY]?.newValue as AuthFlow | undefined;
        if (flow && flow.status !== 'pending') safely(boot, 'boot');
      }
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => {
      mounted.current = false;
      chrome.storage.onChanged.removeListener(onStorage);
      stopPolling();
    };
    // boot is intentionally run once per popup open.
  }, []);

  useEffect(() => {
    if (view.name !== 'analyzing' && view.name !== 'auth_pending') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [view.name]);

  // Move focus to the new heading so keyboard and screen-reader users follow state changes.
  useEffect(() => {
    if (view.name !== 'detecting') headingRef.current?.focus({ preventScroll: true });
  }, [view.name]);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return;
    const update = () => setSystemDark(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
  }, [theme]);

  const effectiveTheme = theme ?? (systemDark ? 'dark' : 'light');
  const toggleTheme = () => {
    const next = effectiveTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    void chrome.storage.local.set({ theme: next });
  };

  // ---------- Render ----------
  const viewDomain =
    view.name === 'analyzing'
      ? view.record.domain
      : view.name === 'result'
        ? (view.registered?.domain ?? view.guest?.domain ?? view.record?.domain)
        : view.name === 'notice' && view.record
          ? view.record.domain
          : page?.supported
            ? page.domain
            : undefined;

  const heading = (text: string) => (
    <h1 ref={headingRef} tabIndex={-1}>
      {text}
    </h1>
  );

  const reportUrl = (id: string) => appLink(APP_URL, '/app/analysis/', id);
  const otherPageAvailable =
    page?.supported && view.name === 'result' && view.record && view.record.url !== page.url;

  let body: React.ReactNode;
  switch (view.name) {
    case 'detecting':
      body = (
        <div className="state" role="status">
          {heading('Detecting page')}
          <p className="muted">
            <Spinner /> Checking the active tab…
          </p>
        </div>
      );
      break;
    case 'unsupported': {
      const copy = unsupportedCopy[page && !page.supported ? page.reason : 'invalid'];
      body = (
        <div className="state">
          {heading(copy.title)}
          <p className="muted">{copy.detail}</p>
        </div>
      );
      break;
    }
    case 'ready':
      body = (
        <div className="state">
          {heading('Ready to analyze')}
          <p className="muted">
            ProspectAI will fetch this public website, score it from real evidence and show you what
            you could sell.
          </p>
          <button
            type="button"
            className="button button-primary button-large"
            onClick={() => void analyze()}
          >
            Analyze {page?.supported ? page.domain : 'this website'}
          </button>
          <p className="fine-print">
            Only this page’s address is sent to ProspectAI, and only when you click Analyze. Your
            browsing is never monitored.
          </p>
          {session === 'registered' && usage && (
            <p className="usage" role="status">
              {usage.remaining === null
                ? 'Unlimited analyses on your plan'
                : `${usage.remaining} of ${usage.limit} analyses left this period`}
            </p>
          )}
          {session === 'guest' && guest && (
            <div className="guest-bar">
              <span>
                {guest.trialRemaining} of {guest.trialLimit} free analyses left
              </span>
              <button
                type="button"
                className="link-action"
                onClick={() => void startSignIn('account')}
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      );
      break;
    case 'submitting':
      body = (
        <div className="state" role="status">
          {heading('Starting analysis')}
          <p className="muted">
            <Spinner /> Sending {page?.supported ? page.domain : 'the page'} to ProspectAI…
          </p>
        </div>
      );
      break;
    case 'analyzing':
      body = (
        <div className="state">
          {heading('Analysis in progress')}
          <div aria-live="polite">
            <ProgressPanel
              domain={view.record.domain}
              job={view.job}
              submittedAt={view.record.submittedAt}
              now={now}
              reconnecting={view.reconnecting}
            />
          </div>
        </div>
      );
      break;
    case 'result':
      body = (
        <div className="state">
          {heading(
            view.registered?.status === 'partial' || view.guest?.status === 'partial'
              ? 'Partial result ready'
              : 'Result ready',
          )}
          {view.registered && (
            <RegisteredResultView
              result={view.registered}
              actions={{
                reportUrl: reportUrl(view.registered.id),
                save,
                onSave: () => void saveProspect(view.registered!),
                pitch,
                onPitch: () => void generatePitch(view.registered!),
                onCopyPitch: () => void copyPitch(),
                copied,
                pdf,
                onPdf: () => void downloadPdf(view.registered!.id, view.registered!.domain),
              }}
            />
          )}
          {view.guest && (
            <GuestResultView
              result={view.guest}
              remaining={guest?.trialRemaining}
              onCreateAccount={() => void startSignIn('account')}
              onPdf={() => void downloadPdf(view.guest!.id, view.guest!.domain)}
              pdf={pdf}
            />
          )}
          <button type="button" className="button button-ghost" onClick={() => void finishResult()}>
            {otherPageAvailable && page?.supported ? `Analyze ${page.domain} instead` : 'Done'}
          </button>
        </div>
      );
      break;
    case 'notice': {
      const { notice: current } = view;
      const label: Record<Notice['action'], string | undefined> = {
        retry: 'Try again',
        resume: 'Check again',
        sign_in:
          current.kind === 'sign_in_failed' || current.kind === 'sign_in_cancelled'
            ? 'Try signing in again'
            : 'Sign in again',
        upgrade: 'See plans',
        create_account: 'Create free account',
        analyze_again: 'Try again',
        none: undefined,
      };
      body = (
        <div className="state">
          {heading(current.title)}
          <p className="muted" role="alert">
            {current.detail}
          </p>
          {label[current.action] && (
            <button
              type="button"
              className="button button-primary"
              onClick={() => safely(() => runNoticeAction(view), view.retry)}
            >
              {label[current.action]}
            </button>
          )}
          {current.kind === 'session_expired' && (
            <button
              type="button"
              className="button button-ghost"
              onClick={() => void continueAsGuest()}
            >
              Continue as guest
            </button>
          )}
          {current.kind === 'quota_exhausted' && (
            <ExternalLink href={appLink(APP_URL, '/app/usage')}>View usage</ExternalLink>
          )}
          {view.record && !isRunning(view.record) && (
            <button
              type="button"
              className="button button-ghost"
              onClick={() => void finishResult()}
            >
              Dismiss
            </button>
          )}
        </div>
      );
      break;
    }
    case 'guest_limit':
      body = (
        <div className="state">
          {heading('Free analyses used')}
          <p className="muted">
            You have used your {guest?.trialLimit ?? ''} free guest analyses. A free account
            continues with monthly analyses, saved prospects and AI-written pitches. Your guest
            results move into the account.
          </p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => void startSignIn('google')}
          >
            Continue with Google
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => void startSignIn('account')}
          >
            Sign in or create account with email
          </button>
        </div>
      );
      break;
    case 'auth_pending':
      body = (
        <div className="state" role="status">
          {heading('Finish signing in')}
          <p className="muted">
            Complete sign-in in the ProspectAI window. You can reopen this popup afterwards; your
            account connects automatically.
          </p>
          <p className="muted">
            <Spinner /> Waiting for ProspectAI…
          </p>
          {now - Date.parse(view.startedAt) > 60_000 && (
            <button
              type="button"
              className="button button-ghost"
              onClick={() => void startSignIn('account')}
            >
              Start sign-in again
            </button>
          )}
        </div>
      );
      break;
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <img src={brandIconUrl} alt="" width="22" height="22" />
          <span>
            Prospect<strong>AI</strong>
          </span>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label={effectiveTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={toggleTheme}
        >
          <span aria-hidden="true">{effectiveTheme === 'dark' ? '☀' : '☾'}</span>
        </button>
      </header>
      {viewDomain && (
        <p className="site" title={viewDomain}>
          <span className="site-dot" aria-hidden="true" />
          {viewDomain}
        </p>
      )}
      {signedInBanner && session === 'registered' && (
        <p className="banner" role="status">
          Account connected. Your guest results are now in your workspace.
        </p>
      )}
      <main>{body}</main>
      <footer className="footer">
        {session === 'registered' ? (
          <>
            <ExternalLink href={appLink(APP_URL, '/app')}>Dashboard</ExternalLink>
            <button type="button" className="link-action" onClick={() => void signOut()}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <ExternalLink href={appLink(APP_URL, '/privacy')}>Privacy</ExternalLink>
            <span className="muted">Analysis starts only when you click.</span>
          </>
        )}
      </footer>
    </div>
  );
}
