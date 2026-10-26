-- CreateEnum
CREATE TYPE "BoundaryStatus" AS ENUM ('NONE', 'APPROXIMATE', 'SURVEYED');

-- CreateEnum
CREATE TYPE "PassportStatus" AS ENUM ('NOT_PROVIDED', 'RECEIVED', 'UNDER_REVIEW', 'REVIEWED', 'NEEDS_FOLLOW_UP');

-- CreateEnum
CREATE TYPE "FacilityStatus" AS ENUM ('EXISTING', 'PROPOSED', 'UNCONFIRMED');

-- CreateEnum
CREATE TYPE "FinishLevel" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "BuildStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'HANDOVER', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'REPORTED_COMPLETE', 'INSPECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('CONTRACTOR_REPORTED', 'STAFF_OBSERVED', 'INDEPENDENT_INSPECTION', 'PROFESSIONAL_CERTIFICATE');

-- CreateEnum
CREATE TYPE "ChangeStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'PROJECT_MANAGER';
ALTER TYPE "Role" ADD VALUE 'CUSTOMER';

-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "scenarioId" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "boundary" JSONB,
ADD COLUMN     "boundarySource" TEXT,
ADD COLUMN     "boundaryStatus" "BoundaryStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "developerId" TEXT,
ADD COLUMN     "frontBearing" DOUBLE PRECISION,
ADD COLUMN     "maxCoveragePct" DOUBLE PRECISION,
ADD COLUMN     "nearbyFacilities" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "plotDepthFt" DOUBLE PRECISION,
ADD COLUMN     "plotWidthFt" DOUBLE PRECISION,
ADD COLUMN     "setbackFrontFt" DOUBLE PRECISION,
ADD COLUMN     "setbackRearFt" DOUBLE PRECISION,
ADD COLUMN     "setbackSideFt" DOUBLE PRECISION,
ADD COLUMN     "siteConstraints" TEXT;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "plotfitWeights" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "SiteVisit" ADD COLUMN     "customerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "Developer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "notes" TEXT,
    "authorised" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassportItem" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "status" "PassportStatus" NOT NULL DEFAULT 'NOT_PROVIDED',
    "documentId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publicNote" TEXT,
    "privateNote" TEXT,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyActivity" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostAssumption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "finish" "FinishLevel" NOT NULL,
    "locationId" TEXT,
    "constructionPerSqft" DOUBLE PRECISION NOT NULL,
    "foundationPerSqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sitePreparation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utilitiesConnection" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "registrationPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "landscapingPerSqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parkingPerSlot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contingencyPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostAssumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedProperty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningScenario" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT,
    "name" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "plotSnapshot" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "costAssumptionId" TEXT,
    "propertyUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastAlertAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildProject" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "propertyId" TEXT,
    "managerId" TEXT,
    "contractorName" TEXT,
    "scope" TEXT NOT NULL,
    "contractValue" BIGINT NOT NULL,
    "plannedStart" DATE NOT NULL,
    "plannedEnd" DATE NOT NULL,
    "agreementRef" TEXT NOT NULL,
    "agreementDate" DATE NOT NULL,
    "status" "BuildStatus" NOT NULL DEFAULT 'PLANNING',
    "customerNote" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "plannedDate" DATE,
    "completedDate" DATE,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "evidence" "EvidenceSource",
    "responsible" TEXT,
    "notes" TEXT,
    "issues" TEXT,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BuildMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildUpdate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "source" "EvidenceSource" NOT NULL,
    "body" TEXT NOT NULL,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "updateId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "allowance" BIGINT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildPayment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "amount" BIGINT NOT NULL,
    "receivedOn" DATE NOT NULL,
    "reference" TEXT NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "costImpact" BIGINT NOT NULL DEFAULT 0,
    "scheduleImpactDays" INTEGER NOT NULL DEFAULT 0,
    "status" "ChangeStatus" NOT NULL DEFAULT 'PROPOSED',
    "requestedById" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildQuestion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "reply" TEXT,
    "repliedById" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoverItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "doneById" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HandoverItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PassportItem_propertyId_idx" ON "PassportItem"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyActivity_propertyId_createdAt_idx" ON "PropertyActivity"("propertyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedProperty_userId_propertyId_key" ON "SavedProperty"("userId", "propertyId");

-- CreateIndex
CREATE INDEX "PlanningScenario_userId_idx" ON "PlanningScenario"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BuildProject_code_key" ON "BuildProject"("code");

-- CreateIndex
CREATE INDEX "BuildMilestone_projectId_sortOrder_idx" ON "BuildMilestone"("projectId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassportItem" ADD CONSTRAINT "PassportItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassportItem" ADD CONSTRAINT "PassportItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PropertyDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassportItem" ADD CONSTRAINT "PassportItem_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyActivity" ADD CONSTRAINT "PropertyActivity_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedProperty" ADD CONSTRAINT "SavedProperty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedProperty" ADD CONSTRAINT "SavedProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningScenario" ADD CONSTRAINT "PlanningScenario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningScenario" ADD CONSTRAINT "PlanningScenario_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildProject" ADD CONSTRAINT "BuildProject_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildProject" ADD CONSTRAINT "BuildProject_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildProject" ADD CONSTRAINT "BuildProject_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildMilestone" ADD CONSTRAINT "BuildMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuildProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildUpdate" ADD CONSTRAINT "BuildUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuildProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildUpdate" ADD CONSTRAINT "BuildUpdate_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "BuildMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildUpdate" ADD CONSTRAINT "BuildUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildFile" ADD CONSTRAINT "BuildFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuildProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildFile" ADD CONSTRAINT "BuildFile_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "BuildUpdate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuildProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildPayment" ADD CONSTRAINT "BuildPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuildProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildPayment" ADD CONSTRAINT "BuildPayment_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "BuildMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuildProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildQuestion" ADD CONSTRAINT "BuildQuestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuildProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildQuestion" ADD CONSTRAINT "BuildQuestion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverItem" ADD CONSTRAINT "HandoverItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuildProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
