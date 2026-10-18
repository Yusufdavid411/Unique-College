ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'APPLICANT';

ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'RETURNED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'INTERVIEW_SCHEDULED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'ADMITTED';

CREATE TYPE "DocumentType" AS ENUM ('PASSPORT', 'BIRTH_CERTIFICATE', 'NATIONAL_ID', 'EDUCATIONAL_RESULT', 'CHANGE_OF_NAME', 'PAYMENT_EVIDENCE', 'OTHER');
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "PaymentType" AS ENUM ('APPLICATION_FEE', 'ACCEPTANCE_FEE', 'SCHOOL_FEE', 'OTHER');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

ALTER TABLE "users"
ADD COLUMN "portalUsername" TEXT,
ADD COLUMN "officialEmail" TEXT,
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "applications"
ADD COLUMN "applicantId" TEXT,
ADD COLUMN "applicationNumber" TEXT,
ADD COLUMN "surname" TEXT,
ADD COLUMN "firstName" TEXT,
ADD COLUMN "middleName" TEXT,
ADD COLUMN "lga" TEXT,
ADD COLUMN "nationality" TEXT DEFAULT 'Nigerian',
ADD COLUMN "maritalStatus" TEXT,
ADD COLUMN "postalAddress" TEXT,
ADD COLUMN "permanentAddress" TEXT,
ADD COLUMN "guardianName" TEXT,
ADD COLUMN "guardianAddress" TEXT,
ADD COLUMN "guardianRelationship" TEXT,
ADD COLUMN "guardianPhone" TEXT,
ADD COLUMN "educationRecords" JSONB,
ADD COLUMN "sponsorName" TEXT,
ADD COLUMN "sponsorAddress" TEXT,
ADD COLUMN "sponsorPhone" TEXT,
ADD COLUMN "workExperience" JSONB,
ADD COLUMN "declarationAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "applicationReceiptNo" TEXT,
ADD COLUMN "interviewDate" TIMESTAMP(3),
ADD COLUMN "entranceExamScore" DOUBLE PRECISION,
ADD COLUMN "interviewScore" DOUBLE PRECISION,
ADD COLUMN "dateReceived" TIMESTAMP(3),
ADD COLUMN "dateResumed" TIMESTAMP(3),
ADD COLUMN "studentNumber" TEXT,
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "admittedAt" TIMESTAMP(3);

ALTER TABLE "applications"
ALTER COLUMN "gender" DROP NOT NULL,
ALTER COLUMN "dateOfBirth" DROP NOT NULL,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "state" DROP NOT NULL,
ALTER COLUMN "courseOfInterest" DROP NOT NULL,
ALTER COLUMN "previousQualification" DROP NOT NULL;

CREATE UNIQUE INDEX "users_portalUsername_key" ON "users"("portalUsername");
CREATE UNIQUE INDEX "users_officialEmail_key" ON "users"("officialEmail");
CREATE UNIQUE INDEX "applications_applicantId_key" ON "applications"("applicantId");
CREATE UNIQUE INDEX "applications_applicationNumber_key" ON "applications"("applicationNumber");
CREATE UNIQUE INDEX "applications_studentNumber_key" ON "applications"("studentNumber");

ALTER TABLE "applications" ADD CONSTRAINT "applications_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "application_documents" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "type" "DocumentType" NOT NULL,
  "label" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "type" "PaymentType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "reference" TEXT NOT NULL,
  "proofPath" TEXT,
  "proofFileType" TEXT,
  "proofFileSize" INTEGER,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "reviewNote" TEXT,
  "paidAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_status_history" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "fromStatus" "ApplicationStatus",
  "toStatus" "ApplicationStatus" NOT NULL,
  "note" TEXT,
  "changedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "application_documents_applicationId_idx" ON "application_documents"("applicationId");
CREATE INDEX "application_documents_type_idx" ON "application_documents"("type");
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");
CREATE INDEX "payments_applicationId_idx" ON "payments"("applicationId");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "application_status_history_applicationId_idx" ON "application_status_history"("applicationId");

ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
