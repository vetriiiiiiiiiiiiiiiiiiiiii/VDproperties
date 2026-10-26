-- CreateEnum
CREATE TYPE "ListingSource" AS ENUM ('COMPANY', 'OWNER');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'INSPECTED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('NEW', 'CONTACTED', 'APPOINTMENT_SCHEDULED', 'NEGOTIATING', 'BOOKED', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AppointmentMode" AS ENUM ('SITE_VISIT', 'OFFICE', 'VIDEO_CALL');

-- CreateEnum
CREATE TYPE "FundingSource" AS ENUM ('OWN_FUNDS', 'HOME_LOAN', 'BOTH', 'UNDECIDED');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'ZONAL_OFFICER', 'CUSTOMER');
-- Existing staff roles are consolidated: property, enquiry and project managers become Staff.
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE "role"::text
    WHEN 'PROPERTY_MANAGER' THEN 'STAFF'
    WHEN 'ENQUIRY_MANAGER' THEN 'STAFF'
    WHEN 'PROJECT_MANAGER' THEN 'STAFF'
    ELSE "role"::text
  END
)::"Role_new";
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
COMMIT;

-- AlterTable
ALTER TABLE "LeadNote" ADD COLUMN     "purchaseId" TEXT;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "zoneId" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "inspectedAt" TIMESTAMP(3),
ADD COLUMN     "inspectedById" TEXT,
ADD COLUMN     "inspectionNotes" TEXT,
ADD COLUMN     "sellerAddress" TEXT,
ADD COLUMN     "sellerId" TEXT,
ADD COLUMN     "sellerLocationText" TEXT,
ADD COLUMN     "sellerRelation" TEXT,
ADD COLUMN     "source" "ListingSource" NOT NULL DEFAULT 'COMPANY',
ADD COLUMN     "submissionStatus" "SubmissionStatus",
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionEvent" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "actorId" TEXT,
    "status" "SubmissionStatus",
    "message" TEXT,
    "visibleToSeller" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'NEW',
    "propertyId" TEXT,
    "propertyLabel" TEXT NOT NULL,
    "buyerId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "offerAmount" BIGINT,
    "funding" "FundingSource" NOT NULL DEFAULT 'UNDECIDED',
    "timeline" TEXT,
    "message" TEXT,
    "mode" "AppointmentMode" NOT NULL,
    "preferredDate" DATE NOT NULL,
    "timeSlot" "TimeSlot" NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "appointmentNote" TEXT,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "assignedToId" TEXT,
    "followUpAt" TIMESTAMP(3),
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ZoneOfficers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ZoneOfficers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zone_name_key" ON "Zone"("name");

-- CreateIndex
CREATE INDEX "SubmissionEvent_propertyId_createdAt_idx" ON "SubmissionEvent"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequest_status_createdAt_idx" ON "PurchaseRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequest_buyerId_idx" ON "PurchaseRequest"("buyerId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_fingerprint_createdAt_idx" ON "PurchaseRequest"("fingerprint", "createdAt");

-- CreateIndex
CREATE INDEX "_ZoneOfficers_B_index" ON "_ZoneOfficers"("B");

-- CreateIndex
CREATE INDEX "Property_source_submissionStatus_idx" ON "Property"("source", "submissionStatus");

-- CreateIndex
CREATE INDEX "Property_sellerId_idx" ON "Property"("sellerId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_inspectedById_fkey" FOREIGN KEY ("inspectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionEvent" ADD CONSTRAINT "SubmissionEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionEvent" ADD CONSTRAINT "SubmissionEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ZoneOfficers" ADD CONSTRAINT "_ZoneOfficers_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ZoneOfficers" ADD CONSTRAINT "_ZoneOfficers_B_fkey" FOREIGN KEY ("B") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

