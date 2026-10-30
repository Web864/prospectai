-- Nullable structured public-site audit coverage; preserves existing results.
ALTER TABLE "public"."WebsiteAnalysis" ADD COLUMN "auditSnapshot" JSONB;
