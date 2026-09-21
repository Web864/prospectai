CREATE TYPE "AuthActionKind" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');
CREATE TYPE "ExtensionAuthorizationStatus" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'EXPIRED', 'CANCELED');

ALTER TABLE "Profile"
  ADD COLUMN "targetIndustries" JSONB,
  ADD COLUMN "locations" JSONB,
  ADD COLUMN "idealCustomerProfile" TEXT,
  ADD COLUMN "agencyWebsite" TEXT,
  ADD COLUMN "outreachPreferences" TEXT;
ALTER TABLE "WebsiteAnalysis"
  ADD COLUMN "componentScores" JSONB,
  ADD COLUMN "opportunityScore" INTEGER,
  ADD COLUMN "opportunityScoringVersion" TEXT,
  ADD COLUMN "confidence" DOUBLE PRECISION,
  ADD COLUMN "aiStatus" TEXT;
ALTER TABLE "Finding"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "source" TEXT,
  ADD COLUMN "deterministicScore" DOUBLE PRECISION;
ALTER TABLE "Opportunity"
  ADD COLUMN "strength" TEXT,
  ADD COLUMN "scoringVersion" TEXT,
  ADD COLUMN "evidence" JSONB;

CREATE TABLE "AuthActionToken" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "kind" "AuthActionKind" NOT NULL,
  "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthActionToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthActionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AuthActionToken_tokenHash_key" ON "AuthActionToken"("tokenHash");
CREATE INDEX "AuthActionToken_userId_kind_expiresAt_idx" ON "AuthActionToken"("userId", "kind", "expiresAt");

CREATE TABLE "ExtensionAuthorizationRequest" (
  "id" TEXT NOT NULL, "publicId" TEXT NOT NULL, "guestSessionId" TEXT, "userId" TEXT,
  "organizationId" TEXT, "codeChallenge" TEXT NOT NULL, "redirectUri" TEXT NOT NULL,
  "authorizationCodeHash" TEXT, "deviceName" TEXT, "extensionVersion" TEXT NOT NULL,
  "status" "ExtensionAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL, "approvedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExtensionAuthorizationRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExtensionAuthorizationRequest_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestSession"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ExtensionAuthorizationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ExtensionAuthorizationRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ExtensionAuthorizationRequest_publicId_key" ON "ExtensionAuthorizationRequest"("publicId");
CREATE UNIQUE INDEX "ExtensionAuthorizationRequest_authorizationCodeHash_key" ON "ExtensionAuthorizationRequest"("authorizationCodeHash");
CREATE INDEX "ExtensionAuthorizationRequest_status_expiresAt_idx" ON "ExtensionAuthorizationRequest"("status", "expiresAt");
CREATE INDEX "ExtensionAuthorizationRequest_guestSessionId_createdAt_idx" ON "ExtensionAuthorizationRequest"("guestSessionId", "createdAt");

ALTER TABLE "ExtensionSession" ADD CONSTRAINT "ExtensionSession_authorizationRequestId_fkey"
  FOREIGN KEY ("authorizationRequestId") REFERENCES "ExtensionAuthorizationRequest"("publicId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RateLimitBucket" (
  "id" TEXT NOT NULL, "keyHash" TEXT NOT NULL, "action" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL, "count" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RateLimitBucket_keyHash_action_windowStart_key" ON "RateLimitBucket"("keyHash", "action", "windowStart");
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

ALTER TABLE "Pitch" ADD CONSTRAINT "Pitch_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "WebsiteAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "WebsiteAnalysis_organizationId_opportunityScore_idx" ON "WebsiteAnalysis"("organizationId", "opportunityScore");