-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."ExtensionSessionStatus" AS ENUM ('PENDING', 'CONNECTED', 'EXPIRING', 'EXPIRED', 'REVOKED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "public"."UsageOperation" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED', 'REVERSED');

-- CreateEnum
CREATE TYPE "public"."AnalysisJobStatus" AS ENUM ('QUEUED', 'VALIDATING', 'FETCHING', 'RENDERING', 'EXTRACTING', 'RULE_ANALYSIS', 'AI_PROCESSING', 'OPPORTUNITY_SCORING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELED', 'RETRY_PENDING', 'RETRYING');

-- CreateEnum
CREATE TYPE "public"."FindingSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST', 'ARCHIVED');

-- CreateTable
CREATE TABLE "public"."User" (    "id" TEXT NOT NULL,    "email" TEXT NOT NULL,    "emailVerifiedAt" TIMESTAMP(3),    "passwordHash" TEXT,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "updatedAt" TIMESTAMP(3) NOT NULL,    CONSTRAINT "User_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."Profile" (    "id" TEXT NOT NULL,    "userId" TEXT NOT NULL,    "displayName" TEXT,    "roleLabel" TEXT,    "services" JSONB,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "updatedAt" TIMESTAMP(3) NOT NULL,    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."Organization" (    "id" TEXT NOT NULL,    "name" TEXT NOT NULL,    "slug" TEXT NOT NULL,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "updatedAt" TIMESTAMP(3) NOT NULL,    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."Membership" (    "id" TEXT NOT NULL,    "userId" TEXT NOT NULL,    "organizationId" TEXT NOT NULL,    "role" "public"."MembershipRole" NOT NULL DEFAULT 'MEMBER',    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "updatedAt" TIMESTAMP(3) NOT NULL,    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."AuthSession" (    "id" TEXT NOT NULL,    "userId" TEXT NOT NULL,    "tokenHash" TEXT NOT NULL,    "activeOrganizationId" TEXT,    "expiresAt" TIMESTAMP(3) NOT NULL,    "revokedAt" TIMESTAMP(3),    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."ExtensionSession" (    "id" TEXT NOT NULL,    "userId" TEXT NOT NULL,    "organizationId" TEXT NOT NULL,    "tokenHash" TEXT NOT NULL,    "refreshTokenHash" TEXT NOT NULL,    "authorizationRequestId" TEXT NOT NULL,    "codeChallenge" TEXT NOT NULL,    "deviceName" TEXT,    "extensionVersion" TEXT NOT NULL,    "status" "public"."ExtensionSessionStatus" NOT NULL DEFAULT 'PENDING',    "expiresAt" TIMESTAMP(3) NOT NULL,    "lastActiveAt" TIMESTAMP(3),    "revokedAt" TIMESTAMP(3),    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "updatedAt" TIMESTAMP(3) NOT NULL,    CONSTRAINT "ExtensionSession_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."Subscription" (    "id" TEXT NOT NULL,    "organizationId" TEXT NOT NULL,    "provider" TEXT NOT NULL DEFAULT 'stripe',    "providerCustomerId" TEXT,    "providerSubscriptionId" TEXT,    "planCode" TEXT NOT NULL,    "status" "public"."SubscriptionStatus" NOT NULL,    "currentPeriodEnd" TIMESTAMP(3),    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "updatedAt" TIMESTAMP(3) NOT NULL,    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."UsageLedger" (    "id" TEXT NOT NULL,    "organizationId" TEXT NOT NULL,    "operation" "public"."UsageOperation" NOT NULL,    "quantity" INTEGER NOT NULL,    "feature" TEXT NOT NULL,    "idempotencyKey" TEXT NOT NULL,    "referenceType" TEXT,    "referenceId" TEXT,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    CONSTRAINT "UsageLedger_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."Website" (    "id" TEXT NOT NULL,    "organizationId" TEXT NOT NULL,    "canonicalUrl" TEXT NOT NULL,    "domain" TEXT NOT NULL,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "updatedAt" TIMESTAMP(3) NOT NULL,    CONSTRAINT "Website_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."WebsiteAnalysis" (    "id" TEXT NOT NULL,    "organizationId" TEXT NOT NULL,    "websiteId" TEXT NOT NULL,    "status" "public"."AnalysisJobStatus" NOT NULL,    "websiteScore" INTEGER,    "scoringVersion" TEXT,    "businessSummary" TEXT,    "extractedText" TEXT,    "rawContentExpiresAt" TIMESTAMP(3),    "completedAt" TIMESTAMP(3),    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "updatedAt" TIMESTAMP(3) NOT NULL,    CONSTRAINT "WebsiteAnalysis_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."Finding" (    "id" TEXT NOT NULL,    "analysisId" TEXT NOT NULL,    "code" TEXT NOT NULL,    "category" TEXT NOT NULL,    "severity" "public"."FindingSeverity" NOT NULL,    "confidence" DOUBLE PRECISION NOT NULL,    "commercialRelevance" DOUBLE PRECISION NOT NULL,    "title" TEXT NOT NULL,    "evidence" JSONB NOT NULL,    "sourceUrl" TEXT,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."Opportunity" (    "id" TEXT NOT NULL,    "analysisId" TEXT NOT NULL,    "title" TEXT NOT NULL,    "summary" TEXT NOT NULL,    "serviceCategory" TEXT NOT NULL,    "opportunityScore" INTEGER NOT NULL,    "confidence" DOUBLE PRECISION NOT NULL,    "commercialReason" TEXT NOT NULL,    "pitchAngle" TEXT,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."OpportunityFinding" (    "opportunityId" TEXT NOT NULL,    "findingId" TEXT NOT NULL,    CONSTRAINT "OpportunityFinding_pkey" PRIMARY KEY ("opportunityId","findingId"));

-- CreateTable
CREATE TABLE "public"."Lead" (    "id" TEXT NOT NULL,    "organizationId" TEXT NOT NULL,    "websiteId" TEXT,    "status" "public"."LeadStatus" NOT NULL DEFAULT 'NEW',    "name" TEXT,    "notes" TEXT,    "archivedAt" TIMESTAMP(3),    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "updatedAt" TIMESTAMP(3) NOT NULL,    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."LeadContact" (    "id" TEXT NOT NULL,    "leadId" TEXT NOT NULL,    "name" TEXT,    "email" TEXT,    "title" TEXT,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    CONSTRAINT "LeadContact_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."Pitch" (    "id" TEXT NOT NULL,    "organizationId" TEXT NOT NULL,    "leadId" TEXT,    "analysisId" TEXT,    "format" TEXT NOT NULL,    "content" TEXT NOT NULL,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "updatedAt" TIMESTAMP(3) NOT NULL,    CONSTRAINT "Pitch_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."Activity" (    "id" TEXT NOT NULL,    "organizationId" TEXT NOT NULL,    "actorUserId" TEXT,    "leadId" TEXT,    "type" TEXT NOT NULL,    "metadata" JSONB,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."AnalysisJob" (    "id" TEXT NOT NULL,    "organizationId" TEXT NOT NULL,    "analysisId" TEXT NOT NULL,    "status" "public"."AnalysisJobStatus" NOT NULL DEFAULT 'QUEUED',    "queueJobId" TEXT,    "idempotencyKey" TEXT NOT NULL,    "attempt" INTEGER NOT NULL DEFAULT 0,    "progress" INTEGER NOT NULL DEFAULT 0,    "errorCode" TEXT,    "errorMessage" TEXT,    "workerId" TEXT,    "startedAt" TIMESTAMP(3),    "finishedAt" TIMESTAMP(3),    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "updatedAt" TIMESTAMP(3) NOT NULL,    CONSTRAINT "AnalysisJob_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."WebhookEvent" (    "id" TEXT NOT NULL,    "organizationId" TEXT,    "provider" TEXT NOT NULL,    "providerEventId" TEXT NOT NULL,    "type" TEXT NOT NULL,    "payload" JSONB NOT NULL,    "processedAt" TIMESTAMP(3),    "failedAt" TIMESTAMP(3),    "failureReason" TEXT,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id"));

-- CreateTable
CREATE TABLE "public"."AuditLog" (    "id" TEXT NOT NULL,    "organizationId" TEXT,    "actorUserId" TEXT,    "action" TEXT NOT NULL,    "resourceType" TEXT NOT NULL,    "resourceId" TEXT,    "metadata" JSONB,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"));

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "public"."Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "public"."Organization"("slug");

-- CreateIndex
CREATE INDEX "Membership_organizationId_role_idx" ON "public"."Membership"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "public"."Membership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "public"."AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "public"."AuthSession"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionSession_tokenHash_key" ON "public"."ExtensionSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionSession_refreshTokenHash_key" ON "public"."ExtensionSession"("refreshTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionSession_authorizationRequestId_key" ON "public"."ExtensionSession"("authorizationRequestId");

-- CreateIndex
CREATE INDEX "ExtensionSession_organizationId_status_idx" ON "public"."ExtensionSession"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ExtensionSession_userId_status_idx" ON "public"."ExtensionSession"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "public"."Subscription"("providerSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_status_idx" ON "public"."Subscription"("organizationId", "status");

-- CreateIndex
CREATE INDEX "UsageLedger_organizationId_feature_createdAt_idx" ON "public"."UsageLedger"("organizationId", "feature", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UsageLedger_organizationId_feature_idempotencyKey_key" ON "public"."UsageLedger"("organizationId", "feature", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Website_organizationId_updatedAt_idx" ON "public"."Website"("organizationId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Website_organizationId_domain_key" ON "public"."Website"("organizationId", "domain");

-- CreateIndex
CREATE INDEX "WebsiteAnalysis_organizationId_createdAt_idx" ON "public"."WebsiteAnalysis"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteAnalysis_websiteId_completedAt_idx" ON "public"."WebsiteAnalysis"("websiteId", "completedAt");

-- CreateIndex
CREATE INDEX "Finding_analysisId_category_idx" ON "public"."Finding"("analysisId", "category");

-- CreateIndex
CREATE INDEX "Opportunity_analysisId_opportunityScore_idx" ON "public"."Opportunity"("analysisId", "opportunityScore");

-- CreateIndex
CREATE INDEX "Lead_organizationId_status_updatedAt_idx" ON "public"."Lead"("organizationId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "LeadContact_leadId_idx" ON "public"."LeadContact"("leadId");

-- CreateIndex
CREATE INDEX "Pitch_organizationId_createdAt_idx" ON "public"."Pitch"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_organizationId_createdAt_idx" ON "public"."Activity"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisJob_queueJobId_key" ON "public"."AnalysisJob"("queueJobId");

-- CreateIndex
CREATE INDEX "AnalysisJob_organizationId_status_createdAt_idx" ON "public"."AnalysisJob"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisJob_organizationId_idempotencyKey_key" ON "public"."AnalysisJob"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_providerEventId_key" ON "public"."WebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_createdAt_idx" ON "public"."WebhookEvent"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "public"."AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "public"."AuditLog"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExtensionSession" ADD CONSTRAINT "ExtensionSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExtensionSession" ADD CONSTRAINT "ExtensionSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UsageLedger" ADD CONSTRAINT "UsageLedger_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Website" ADD CONSTRAINT "Website_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WebsiteAnalysis" ADD CONSTRAINT "WebsiteAnalysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WebsiteAnalysis" ADD CONSTRAINT "WebsiteAnalysis_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Finding" ADD CONSTRAINT "Finding_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "public"."WebsiteAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Opportunity" ADD CONSTRAINT "Opportunity_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "public"."WebsiteAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OpportunityFinding" ADD CONSTRAINT "OpportunityFinding_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OpportunityFinding" ADD CONSTRAINT "OpportunityFinding_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "public"."Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."Website"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeadContact" ADD CONSTRAINT "LeadContact_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pitch" ADD CONSTRAINT "Pitch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pitch" ADD CONSTRAINT "Pitch_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnalysisJob" ADD CONSTRAINT "AnalysisJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnalysisJob" ADD CONSTRAINT "AnalysisJob_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "public"."WebsiteAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WebhookEvent" ADD CONSTRAINT "WebhookEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
