-- Value-first onboarding: anonymous guest sessions with server-authoritative trial usage.
CREATE TYPE "public"."GuestSessionStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'EXPIRED', 'REVOKED');

CREATE TABLE "public"."GuestSession" (
  "id" TEXT NOT NULL,
  "guestPublicId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "trialLimit" INTEGER NOT NULL,
  "status" "public"."GuestSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "convertedUserId" TEXT,
  "convertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuestSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GuestSession_trialLimit_check" CHECK ("trialLimit" >= 0)
);

ALTER TABLE "public"."WebsiteAnalysis" ADD COLUMN "guestSessionId" TEXT;
ALTER TABLE "public"."AnalysisJob" ADD COLUMN "guestSessionId" TEXT;

CREATE UNIQUE INDEX "GuestSession_guestPublicId_key" ON "public"."GuestSession"("guestPublicId");
CREATE UNIQUE INDEX "GuestSession_tokenHash_key" ON "public"."GuestSession"("tokenHash");
CREATE UNIQUE INDEX "GuestSession_organizationId_key" ON "public"."GuestSession"("organizationId");
CREATE INDEX "GuestSession_status_expiresAt_idx" ON "public"."GuestSession"("status", "expiresAt");
CREATE INDEX "GuestSession_convertedUserId_convertedAt_idx" ON "public"."GuestSession"("convertedUserId", "convertedAt");
CREATE INDEX "WebsiteAnalysis_guestSessionId_createdAt_idx" ON "public"."WebsiteAnalysis"("guestSessionId", "createdAt");
CREATE INDEX "AnalysisJob_guestSessionId_status_createdAt_idx" ON "public"."AnalysisJob"("guestSessionId", "status", "createdAt");

ALTER TABLE "public"."GuestSession" ADD CONSTRAINT "GuestSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."GuestSession" ADD CONSTRAINT "GuestSession_convertedUserId_fkey" FOREIGN KEY ("convertedUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."WebsiteAnalysis" ADD CONSTRAINT "WebsiteAnalysis_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "public"."GuestSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."AnalysisJob" ADD CONSTRAINT "AnalysisJob_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "public"."GuestSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
