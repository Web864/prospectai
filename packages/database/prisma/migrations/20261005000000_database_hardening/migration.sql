-- Phase 7 production hardening. All changes are additive and preserve existing rows.
-- Dynamic identifiers keep mixed-case Prisma table names intact across PostgreSQL clients.
DO $migration$
BEGIN
  EXECUTE format('CREATE UNIQUE INDEX %I ON %I.%I (%I, %I)', 'Lead_organizationId_websiteId_key', 'public', 'Lead', 'organizationId', 'websiteId');
  EXECUTE format('CREATE INDEX %I ON %I.%I (%I, %I)', 'Pitch_organizationId_updatedAt_idx', 'public', 'Pitch', 'organizationId', 'updatedAt');
  EXECUTE format('CREATE INDEX %I ON %I.%I (%I, %I)', 'Subscription_organizationId_updatedAt_idx', 'public', 'Subscription', 'organizationId', 'updatedAt');
  EXECUTE format('CREATE INDEX %I ON %I.%I (%I, %I) WHERE %I IS NULL AND %I IN (%L::%I.%I, %L::%I.%I)', 'AnalysisJob_claimable_partial_idx', 'public', 'AnalysisJob', 'nextAttemptAt', 'createdAt', 'lockedAt', 'status', 'QUEUED', 'public', 'AnalysisJobStatus', 'RETRY_PENDING', 'public', 'AnalysisJobStatus');
END
$migration$;

DO $constraints$
BEGIN
  EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I CHECK (%I > 0) NOT VALID', 'public', 'UsageLedger', 'UsageLedger_quantity_check', 'quantity');
  EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I CHECK ((%I IS NULL OR %I BETWEEN 0 AND 100) AND (%I IS NULL OR %I BETWEEN 0 AND 100) AND (%I IS NULL OR %I BETWEEN 0 AND 1)) NOT VALID', 'public', 'WebsiteAnalysis', 'WebsiteAnalysis_scores_check', 'websiteScore', 'websiteScore', 'opportunityScore', 'opportunityScore', 'confidence', 'confidence');
  EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I CHECK (%I BETWEEN 0 AND 1) NOT VALID', 'public', 'Finding', 'Finding_confidence_check', 'confidence');
  EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I CHECK (%I BETWEEN 0 AND 1) NOT VALID', 'public', 'Finding', 'Finding_commercialRelevance_check', 'commercialRelevance');
  EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I CHECK (%I BETWEEN 0 AND 100) NOT VALID', 'public', 'Opportunity', 'Opportunity_score_check', 'opportunityScore');
  EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I CHECK (%I BETWEEN 0 AND 1) NOT VALID', 'public', 'Opportunity', 'Opportunity_confidence_check', 'confidence');
  EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I CHECK (%I >= 0) NOT VALID', 'public', 'RateLimitBucket', 'RateLimitBucket_count_check', 'count');
  EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I CHECK (%I <= %I) NOT VALID', 'public', 'AnalysisJob', 'AnalysisJob_attempt_bound_check', 'attempt', 'maxAttempts');
  EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I CHECK ((%I IS NULL AND %I IS NULL) OR (%I IS NOT NULL AND %I IS NOT NULL)) NOT VALID', 'public', 'AnalysisJob', 'AnalysisJob_lock_pair_check', 'lockedAt', 'lockedBy', 'lockedAt', 'lockedBy');
END
$constraints$;

DO $validate$
BEGIN
  EXECUTE format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I', 'public', 'UsageLedger', 'UsageLedger_quantity_check');
  EXECUTE format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I', 'public', 'WebsiteAnalysis', 'WebsiteAnalysis_scores_check');
  EXECUTE format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I', 'public', 'Finding', 'Finding_confidence_check');
  EXECUTE format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I', 'public', 'Finding', 'Finding_commercialRelevance_check');
  EXECUTE format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I', 'public', 'Opportunity', 'Opportunity_score_check');
  EXECUTE format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I', 'public', 'Opportunity', 'Opportunity_confidence_check');
  EXECUTE format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I', 'public', 'RateLimitBucket', 'RateLimitBucket_count_check');
  EXECUTE format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I', 'public', 'AnalysisJob', 'AnalysisJob_attempt_bound_check');
  EXECUTE format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I', 'public', 'AnalysisJob', 'AnalysisJob_lock_pair_check');
END
$validate$;
