ALTER TYPE "PaymentType" ADD VALUE 'SCREENING_FEE';
ALTER TABLE applications ADD COLUMN "screeningFeeAmount" DECIMAL(12,2),
  ADD COLUMN "screeningStatus" TEXT NOT NULL DEFAULT 'NOT_SCHEDULED',
  ADD COLUMN "screeningAt" TIMESTAMP(3), ADD COLUMN "screeningVenue" TEXT,
  ADD COLUMN "screeningInstructions" TEXT, ADD COLUMN "screeningResultAt" TIMESTAMP(3),
  ADD COLUMN "requiresAcceptanceForm" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE applications ADD CONSTRAINT screening_status_check CHECK ("screeningStatus" IN ('NOT_SCHEDULED','SCHEDULED','PASSED','FAILED','EXEMPT'));
ALTER TABLE applications ADD CONSTRAINT screening_fee_check CHECK ("screeningFeeAmount" IS NULL OR "screeningFeeAmount" >= 0);
UPDATE applications SET "screeningStatus"='EXEMPT', "requiresAcceptanceForm"=false WHERE status IN ('ACCEPTED','ADMITTED');
ALTER TABLE application_status_history ADD COLUMN "notificationSubject" TEXT, ADD COLUMN "notificationText" TEXT;
CREATE TABLE school_forms (id TEXT PRIMARY KEY, "applicationId" TEXT NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('ACCEPTANCE','GUARANTOR','STUDENT_RECORD')), data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED')), "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("applicationId",kind));
CREATE TABLE admission_letters (id TEXT PRIMARY KEY, "applicationId" TEXT NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL, snapshot JSONB NOT NULL, "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "issuedBy" TEXT NOT NULL,
  UNIQUE ("applicationId",version));
INSERT INTO site_settings (id,key,value,"group","updatedAt") VALUES (gen_random_uuid()::text,'screening_policy','{"amount":2000}','admissions',CURRENT_TIMESTAMP) ON CONFLICT (key) DO NOTHING;
UPDATE site_settings SET value=jsonb_set(value::jsonb,'{applicationFee}','5000'::jsonb)::text,"updatedAt"=CURRENT_TIMESTAMP WHERE key='admissions_policy';
