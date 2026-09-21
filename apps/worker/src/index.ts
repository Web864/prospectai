import { hostname } from 'node:os';
import { OpenAiProvider, analyzeBusiness } from '@prospectai/ai';
import {
  PostgresAnalysisJobQueue,
  analyzePageEvidence,
  type ClaimedAnalysisJob,
  type DeterministicFinding,
} from '@prospectai/analysis';
import { loadAiEnvironment, loadGuestEnvironment, loadWorkerEnvironment } from '@prospectai/config';
import { HttpFirstCrawler } from '@prospectai/crawler';
import { prisma } from '@prospectai/database';
import {
  aggregateOpportunityScore,
  calculateWebsiteComponents,
  calculateWebsiteScore,
  opportunityScoringVersion,
  recommendServices,
  scoringVersion,
} from '@prospectai/scoring';
import { AppError, createLogger } from '@prospectai/shared';

const logger = createLogger('analysis-worker');

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function leaseFor(job: ClaimedAnalysisJob) {
  return { id: job.id, lockedBy: job.lockedBy, attempt: job.attempt };
}

function databaseSeverity(severity: number) {
  if (severity >= 5) return 'CRITICAL' as const;
  if (severity >= 4) return 'HIGH' as const;
  if (severity >= 3) return 'MEDIUM' as const;
  if (severity >= 2) return 'LOW' as const;
  return 'INFO' as const;
}

function scoringInput(finding: DeterministicFinding) {
  return {
    code: finding.code,
    category: finding.category,
    severity: finding.severity,
    confidence: finding.confidence,
    commercialRelevance: finding.commercialRelevance,
    title: finding.title,
    evidence: finding.evidence.observation,
  };
}

async function processJob(
  queue: PostgresAnalysisJobQueue,
  job: ClaimedAnalysisJob,
  heartbeatIntervalMs: number,
) {
  const lease = leaseFor(job);
  const heartbeat = setInterval(() => {
    void queue.heartbeat(lease).catch((error: unknown) =>
      logger.error('job_heartbeat_failed', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown heartbeat failure',
      }),
    );
  }, heartbeatIntervalMs);
  try {
    await queue.updateProgress(lease, 'validating', Math.max(job.progress, 5));
    const analysis = await prisma.websiteAnalysis.findFirst({
      where: { id: job.analysisId, organizationId: job.organizationId },
      include: {
        website: true,
        organization: {
          include: {
            memberships: {
              orderBy: { createdAt: 'asc' },
              take: 1,
              include: { user: { include: { profile: true } } },
            },
          },
        },
      },
    });
    if (!analysis)
      throw new AppError('NOT_FOUND', 'The analysis no longer exists in this organization.', 404);

    logger.info('analysis_job_claimed', {
      jobId: job.id,
      organizationId: job.organizationId,
      attempt: job.attempt,
      maxAttempts: job.maxAttempts,
    });

    await queue.updateProgress(lease, 'fetching', 15);
    const crawler = new HttpFirstCrawler();
    const crawl = await crawler.crawl(new URL(analysis.website.canonicalUrl));

    await queue.updateProgress(lease, 'extracting', 40);
    const findings = analyzePageEvidence(crawl.page);
    const findingInputs = findings.map(scoringInput);

    await queue.updateProgress(lease, 'rule_analysis', 60);
    const websiteScore = calculateWebsiteScore(findingInputs);
    const componentScores = calculateWebsiteComponents(findingInputs);
    const profile = analysis.organization.memberships[0]?.user.profile;
    const services = Array.isArray(profile?.services)
      ? profile.services.filter((value): value is string => typeof value === 'string')
      : [];
    const recommendations = recommendServices(findingInputs, services);
    const opportunityScore = aggregateOpportunityScore(recommendations);

    let businessSummary =
      crawl.page.description ??
      crawl.page.title ??
      `${analysis.website.domain} is a public business website analyzed from observable homepage evidence.`;
    let confidence =
      findings.length === 0
        ? 0.45
        : Number(
            (
              findings.reduce((total, finding) => total + finding.confidence, 0) / findings.length
            ).toFixed(2),
          );
    let aiStatus = 'unavailable';
    let partial = true;

    await queue.updateProgress(lease, 'ai_processing', 75);
    if (process.env.OPENAI_API_KEY) {
      try {
        const environment = loadAiEnvironment();
        const provider = new OpenAiProvider({
          apiKey: environment.OPENAI_API_KEY,
          model: environment.OPENAI_MODEL,
          baseUrl: environment.OPENAI_BASE_URL,
        });
        const business = await analyzeBusiness(provider, {
          domain: analysis.website.domain,
          title: crawl.page.title,
          description: crawl.page.description,
          headings: crawl.page.headings,
          boundedText: crawl.page.text,
        });
        businessSummary = business.summary;
        confidence = business.confidence;
        aiStatus = 'completed';
        partial = false;
      } catch (error) {
        aiStatus = 'unavailable';
        logger.warn('analysis_ai_partial', {
          jobId: job.id,
          error: error instanceof AppError ? error.code : 'AI_UNAVAILABLE',
        });
      }
    }

    await queue.updateProgress(lease, 'opportunity_scoring', 90);
    const guestEnvironment = loadGuestEnvironment();
    const rawContentExpiresAt = new Date(
      Date.now() + guestEnvironment.GUEST_RESULT_RETENTION_DAYS * 24 * 60 * 60_000,
    );
    await prisma.$transaction(async (transaction) => {
      await transaction.opportunity.deleteMany({ where: { analysisId: analysis.id } });
      await transaction.finding.deleteMany({ where: { analysisId: analysis.id } });
      const persistedFindings: Array<{ id: string }> = [];
      for (const finding of findings) {
        persistedFindings.push(
          await transaction.finding.create({
            data: {
              analysisId: analysis.id,
              code: finding.code,
              category: finding.category,
              severity: databaseSeverity(finding.severity),
              confidence: finding.confidence,
              commercialRelevance: finding.commercialRelevance,
              title: finding.title,
              description: finding.description,
              evidence: finding.evidence,
              source: finding.source,
              sourceUrl: finding.sourceUrl,
              deterministicScore: finding.deterministicScore,
            },
          }),
        );
      }
      for (const recommendation of recommendations) {
        const findingIds = recommendation.findingIndexes
          .map((index) => persistedFindings[index]?.id)
          .filter((value): value is string => Boolean(value));
        await transaction.opportunity.create({
          data: {
            analysisId: analysis.id,
            title: `${recommendation.service} opportunity`,
            summary: recommendation.commercialReason,
            serviceCategory: recommendation.service,
            strength: recommendation.strength,
            opportunityScore: recommendation.score,
            scoringVersion: opportunityScoringVersion,
            confidence: recommendation.confidence,
            evidence: recommendation.evidence,
            commercialReason: recommendation.commercialReason,
            pitchAngle: recommendation.pitchAngle,
            findings: {
              create: findingIds.map((findingId) => ({ findingId })),
            },
          },
        });
      }
      await transaction.websiteAnalysis.update({
        where: { id: analysis.id },
        data: {
          websiteScore,
          componentScores,
          scoringVersion,
          opportunityScore,
          opportunityScoringVersion,
          confidence,
          businessSummary,
          aiStatus,
          extractedText: crawl.page.text,
          rawContentExpiresAt,
        },
      });
      await transaction.website.update({
        where: { id: analysis.websiteId },
        data: { canonicalUrl: crawl.finalUrl },
      });
    });
    await queue.complete(lease, partial ? 'partial' : 'completed');
    logger.info('analysis_job_completed', {
      jobId: job.id,
      outcome: partial ? 'partial' : 'completed',
      websiteScore,
      opportunityScore,
      findingCount: findings.length,
    });
  } catch (error) {
    if (error instanceof AppError && error.code === 'CONFLICT') {
      logger.warn('analysis_job_lease_lost', { jobId: job.id });
      return;
    }
    const result = await queue.fail(lease, {
      code: error instanceof AppError ? error.code : 'ANALYSIS_FAILED',
      message: error instanceof Error ? error.message : 'Unknown analysis worker failure',
    });
    logger.error('analysis_job_failed', {
      jobId: job.id,
      attempt: job.attempt,
      retryScheduled: result.retry,
      errorCode: error instanceof AppError ? error.code : 'ANALYSIS_FAILED',
    });
  } finally {
    clearInterval(heartbeat);
  }
}

export async function startWorker() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to start the worker.');
  const environment = loadWorkerEnvironment();
  const workerId = environment.WORKER_ID ?? `${hostname()}-${process.pid}`;
  const queue = new PostgresAnalysisJobQueue();
  const shutdownController = new AbortController();
  let lastRecoveryAt = 0;

  const shutdown = (signal: string) => {
    logger.info('worker_shutdown_requested', { signal, workerId });
    shutdownController.abort();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  try {
    const recovered = await queue.recoverAbandonedJobs(
      new Date(Date.now() - environment.WORKER_LOCK_TIMEOUT_MS),
    );
    lastRecoveryAt = Date.now();
    logger.info('worker_ready', { workerId, recoveredJobs: recovered });

    while (!shutdownController.signal.aborted) {
      if (Date.now() - lastRecoveryAt >= environment.WORKER_RECOVERY_INTERVAL_MS) {
        const recoveredJobs = await queue.recoverAbandonedJobs(
          new Date(Date.now() - environment.WORKER_LOCK_TIMEOUT_MS),
        );
        lastRecoveryAt = Date.now();
        if (recoveredJobs > 0) logger.warn('abandoned_jobs_recovered', { recoveredJobs });
      }
      const job = await queue.claimNext(workerId);
      if (job)
        await processJob(
          queue,
          job,
          Math.max(1_000, Math.floor(environment.WORKER_LOCK_TIMEOUT_MS / 3)),
        );
      else await wait(environment.WORKER_POLL_INTERVAL_MS, shutdownController.signal);
    }
  } finally {
    await queue.disconnect();
    logger.info('worker_stopped', { workerId });
  }
}

if (process.env.NODE_ENV !== 'test')
  startWorker().catch((error: unknown) => {
    logger.error('worker_start_failed', {
      error: error instanceof Error ? error.message : 'Unknown worker startup error',
    });
    process.exitCode = 1;
  });
