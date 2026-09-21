-- AnalysisJob is the durable V1 queue. Worker ownership is a recoverable PostgreSQL lease.
-- Legacy queue metadata columns remain nullable so this migration cannot discard deployed data.
ALTER TABLE "public"."AnalysisJob"
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "usageFeature" TEXT NOT NULL DEFAULT 'analysis',
  ADD COLUMN "usageQuantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lockedAt" TIMESTAMP(3),
  ADD COLUMN "lockedBy" TEXT;

CREATE INDEX "AnalysisJob_status_nextAttemptAt_createdAt_idx"
ON "public"."AnalysisJob"("status", "nextAttemptAt", "createdAt");

CREATE INDEX "AnalysisJob_status_lockedAt_idx"
ON "public"."AnalysisJob"("status", "lockedAt");
ALTER TABLE "public"."AnalysisJob"
  ADD CONSTRAINT "AnalysisJob_attempt_check" CHECK ("attempt" >= 0),
  ADD CONSTRAINT "AnalysisJob_maxAttempts_check" CHECK ("maxAttempts" > 0),
  ADD CONSTRAINT "AnalysisJob_progress_check" CHECK ("progress" BETWEEN 0 AND 100),
  ADD CONSTRAINT "AnalysisJob_usageQuantity_check" CHECK ("usageQuantity" > 0);