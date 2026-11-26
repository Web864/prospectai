import type { AnalysisJobStatus } from '@prospectai/types';
import type { AnalysisMode } from './state-model';
import { isTerminalStatus } from './state-model';

/**
 * The minimum persisted state needed to recover an analysis after the popup closes, the service
 * worker is stopped, the extension reloads or the browser restarts. It holds identifiers and the
 * URL the user explicitly chose to analyze, never page content or tokens.
 */
export type ActiveAnalysis = {
  jobId: string;
  /** Known from the accepted response; otherwise filled from the first job poll. */
  analysisId?: string;
  mode: AnalysisMode;
  url: string;
  domain: string;
  submittedAt: string;
  status?: AnalysisJobStatus;
  /** The terminal result has been shown to the user at least once. */
  seen?: boolean;
};

export const ACTIVE_ANALYSIS_KEY = 'activeAnalysis';
export const PENDING_SUBMISSION_KEY = 'pendingAnalysisSubmission';
/** Records from older builds; removed on update so they cannot resurrect stale jobs. */
export const legacyJobKeys = [
  'activeAnalysisJobId',
  'activeAnalysisMode',
  'analysisStartedAt',
  'currentGuestAnalysisId',
];
// Jobs finish or fail within minutes; anything older is stale and must not block new work.
const MAX_AGE_MS = 24 * 60 * 60_000;

function isActiveAnalysis(value: unknown): value is ActiveAnalysis {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.jobId === 'string' &&
    (record.analysisId === undefined || typeof record.analysisId === 'string') &&
    (record.mode === 'guest' || record.mode === 'registered') &&
    typeof record.url === 'string' &&
    typeof record.domain === 'string' &&
    typeof record.submittedAt === 'string' &&
    Number.isFinite(Date.parse(record.submittedAt))
  );
}

export async function readActiveAnalysis(now = Date.now()): Promise<ActiveAnalysis | undefined> {
  const stored = await chrome.storage.local.get(ACTIVE_ANALYSIS_KEY);
  const record: unknown = stored[ACTIVE_ANALYSIS_KEY];
  if (record === undefined) return undefined;
  if (!isActiveAnalysis(record) || now - Date.parse(record.submittedAt) > MAX_AGE_MS) {
    await chrome.storage.local.remove(ACTIVE_ANALYSIS_KEY);
    return undefined;
  }
  return record;
}

export async function writeActiveAnalysis(record: ActiveAnalysis) {
  await chrome.storage.local.set({ [ACTIVE_ANALYSIS_KEY]: record });
}

/** Updates the stored record only if it still describes the same job (no cross-job races). */
export async function patchActiveAnalysis(jobId: string, patch: Partial<ActiveAnalysis>) {
  const current = await readActiveAnalysis();
  if (!current || current.jobId !== jobId) return undefined;
  const next = { ...current, ...patch, jobId };
  await writeActiveAnalysis(next);
  return next;
}

export async function clearActiveAnalysis(jobId?: string) {
  if (jobId) {
    const current = await readActiveAnalysis();
    if (current && current.jobId !== jobId) return;
  }
  await chrome.storage.local.remove(ACTIVE_ANALYSIS_KEY);
}

export function isRunning(record: ActiveAnalysis | undefined) {
  return Boolean(record && !isTerminalStatus(record.status));
}

/**
 * Keeps one idempotency key per (mode, URL) until the accepted job is stored. If the popup
 * closes after the request left but before the response arrived, the retry reuses the key and
 * the server returns the same job instead of creating (and charging) a second one.
 */
export async function analysisSubmissionKey(mode: AnalysisMode, url: string) {
  const { [PENDING_SUBMISSION_KEY]: pending } =
    await chrome.storage.local.get(PENDING_SUBMISSION_KEY);
  if (
    pending &&
    typeof pending === 'object' &&
    pending.mode === mode &&
    pending.url === url &&
    typeof pending.key === 'string'
  )
    return pending.key as string;
  const key = crypto.randomUUID();
  await chrome.storage.local.set({ [PENDING_SUBMISSION_KEY]: { mode, url, key } });
  return key;
}

export async function clearSubmissionKey() {
  await chrome.storage.local.remove(PENDING_SUBMISSION_KEY);
}

/**
 * Serializes submission across every extension context (two popups in two windows, popup and
 * service worker) so that a second click waits and then resumes the first job.
 */
export async function withSubmissionLock<T>(work: () => Promise<T>): Promise<T> {
  return typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('prospectai-analysis-submission', work)
    : work();
}
