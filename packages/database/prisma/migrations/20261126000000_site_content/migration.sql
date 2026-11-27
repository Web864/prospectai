-- Public website content (blog posts, landing pages, FAQ) managed from /admin.
-- CreateEnum
CREATE TYPE "public"."ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "public"."SitePageKind" AS ENUM ('BLOG_POST', 'LANDING_PAGE');

-- CreateTable
CREATE TABLE "public"."SitePage" (
    "id" TEXT NOT NULL,
    "kind" "public"."SitePageKind" NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "authorName" TEXT,
    "status" "public"."ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteFaq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteFaq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SitePage_kind_status_publishedAt_idx" ON "public"."SitePage"("kind", "status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SitePage_kind_slug_key" ON "public"."SitePage"("kind", "slug");

-- CreateIndex
CREATE INDEX "SiteFaq_status_sortOrder_idx" ON "public"."SiteFaq"("status", "sortOrder");
