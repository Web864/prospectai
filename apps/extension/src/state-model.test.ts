import { describe, expect, it } from 'vitest';
import { ExtensionApiError } from './api-errors';
import {
  analysisStages,
  bySeverity,
  uniqueByTitle,
  confidenceLabel,
  isTerminalStatus,
  jobHealth,
  noticeFromApi,
  noticeFromJobFailure,
  noticeFromRequestError,
  stageIndex,
  stageLabel,
} from './state-model';

describe('truthful analysis stages', () => {
  it('lists exactly the stages the worker reports, in order', () => {
    // apps/worker/src/index.ts: validating 5, fetching 15, extracting 40, rule_analysis 60,
    // ai_processing 75, opportunity_scoring 90.
    expect(analysisStages.map((stage) => stage.status)).toEqual([
      'queued',
      'validating',
      'fetching',
      'extracting',
      'rule_analysis',
      'ai_processing',
      'opportunity_scoring',
    ]);
    expect(stageIndex('rendering')).toBe(stageIndex('fetching'));
    expect(stageLabel('retry_pending')).toContain('Retrying');
  });

  it('treats only completed, partial, failed and cancelled as terminal', () => {
    for (const status of ['completed', 'partial', 'failed', 'cancelled'] as const)
      expect(isTerminalStatus(status)).toBe(true);
    for (const status of ['queued', 'fetching', 'ai_processing', 'retry_pending'] as const)
      expect(isTerminalStatus(status)).toBe(false);
  });

  it('never calls a long-running job a failure', () => {
    const now = Date.parse('2026-11-26T12:00:00.000Z');
    const at = (seconds: number) => new Date(now - seconds * 1000).toISOString();
    expect(jobHealth({ status: 'fetching', updatedAt: at(5), nextAttemptAt: at(5) }, now)).toBe(
      'normal',
    );
    expect(jobHealth({ status: 'queued', updatedAt: at(45), nextAttemptAt: at(45) }, now)).toBe(
      'waiting_for_worker',
    );
    expect(
      jobHealth({ status: 'ai_processing', updatedAt: at(90), nextAttemptAt: at(90) }, now),
    ).toBe('slow');
    expect(
      jobHealth({ status: 'retry_pending', updatedAt: at(1), nextAttemptAt: at(-20) }, now),
    ).toBe('retry_scheduled');
  });
});

describe('specific, actionable errors', () => {
  it('separates registered quota exhaustion from rate limiting (both are HTTP 429)', () => {
    expect(noticeFromApi(429, 'USAGE_LIMIT_REACHED')).toMatchObject({
      kind: 'quota_exhausted',
      action: 'upgrade',
    });
    expect(noticeFromApi(429, 'RATE_LIMITED')).toMatchObject({
      kind: 'rate_limited',
      action: 'retry',
    });
    expect(noticeFromApi(429, 'GUEST_TRIAL_EXHAUSTED').kind).toBe('guest_quota_exhausted');
  });

  it('maps session, access, server and URL failures to distinct notices', () => {
    expect(noticeFromApi(401, 'UNAUTHENTICATED')).toMatchObject({
      kind: 'session_expired',
      title: 'Your session has expired',
    });
    expect(noticeFromApi(403).kind).toBe('access_denied');
    expect(noticeFromApi(503, 'BACKEND_UNAVAILABLE').title).toBe(
      'The analysis service is temporarily unavailable',
    );
    expect(noticeFromApi(400, 'PRIVATE_NETWORK_BLOCKED').title).toBe(
      'This page cannot be analyzed',
    );
    expect(noticeFromApi(400, 'VALIDATION_ERROR').kind).toBe('request_rejected');
  });

  it('explains persisted crawler failures instead of a generic failure', () => {
    expect(noticeFromJobFailure('failed', 'WEBSITE_UNREACHABLE').title).toBe(
      'We could not access the website',
    );
    expect(noticeFromJobFailure('failed', 'WEBSITE_BLOCKED_CRAWLER').kind).toBe('crawler_blocked');
    expect(noticeFromJobFailure('failed', 'ANALYSIS_TIMEOUT').kind).toBe('crawler_timeout');
    expect(noticeFromJobFailure('failed', 'WORKER_LEASE_EXPIRED').title).toBe(
      'This analysis could not be completed',
    );
    expect(noticeFromJobFailure('cancelled', null).kind).toBe('analysis_cancelled');
  });

  it('distinguishes offline, unreachable, timeout and malformed responses', () => {
    expect(noticeFromRequestError(new ExtensionApiError('NETWORK_UNREACHABLE'), true).title).toBe(
      'ProspectAI could not reach the service',
    );
    expect(noticeFromRequestError(new ExtensionApiError('NETWORK_UNREACHABLE'), false).kind).toBe(
      'offline',
    );
    expect(noticeFromRequestError(new ExtensionApiError('API_TIMEOUT'), true).kind).toBe(
      'request_timeout',
    );
    expect(noticeFromRequestError(new ExtensionApiError('API_INVALID_RESPONSE'), true).kind).toBe(
      'invalid_response',
    );
  });
});

describe('result presentation helpers', () => {
  it('orders findings by severity and labels confidence', () => {
    const ordered = bySeverity([
      { id: 'a', severity: 'LOW' },
      { id: 'b', severity: 'CRITICAL' },
      { id: 'c', severity: 'MEDIUM' },
    ]);
    expect(ordered.map((item) => item.id)).toEqual(['b', 'c', 'a']);
    // One finding per crawled page: the same problem on three pages is listed once.
    const unique = uniqueByTitle([
      { id: 'p1', title: 'Form controls lack detectable labels' },
      { id: 'p2', title: 'Form controls lack detectable labels ' },
      { id: 'p3', title: 'Initial response is slow' },
    ]);
    expect(unique.map((item) => item.id)).toEqual(['p1', 'p3']);
    expect(confidenceLabel(0.82)).toBe('High');
    expect(confidenceLabel(0.6)).toBe('Medium');
    expect(confidenceLabel(0.3)).toBe('Low');
    expect(confidenceLabel(null)).toBe('Unknown');
  });
});
