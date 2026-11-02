ALTER TABLE "applications"
  ADD COLUMN "acceptanceFeeAmount" DECIMAL(12,2),
  ADD COLUMN "offerResponse" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "offerIssuedAt" TIMESTAMP(3),
  ADD COLUMN "offerRespondedAt" TIMESTAMP(3),
  ADD COLUMN "clearanceStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "clearanceNote" TEXT,
  ADD COLUMN "clearedBy" TEXT,
  ADD COLUMN "clearedAt" TIMESTAMP(3);

ALTER TABLE "applications" ADD CONSTRAINT "applications_offer_response_check"
  CHECK ("offerResponse" IN ('PENDING', 'ACCEPTED', 'DECLINED'));
ALTER TABLE "application_status_history" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'STATUS';
ALTER TABLE "applications" ADD CONSTRAINT "applications_clearance_status_check"
  CHECK ("clearanceStatus" IN ('PENDING', 'CLEARED', 'CORRECTIONS_REQUIRED'));
ALTER TABLE "applications" ADD CONSTRAINT "applications_acceptance_fee_nonnegative"
  CHECK ("acceptanceFeeAmount" IS NULL OR "acceptanceFeeAmount" >= 0);

INSERT INTO "site_settings" (id, key, value, "group", "updatedAt")
VALUES (gen_random_uuid()::text, 'acceptance_fee_policy', '{"amount":5000}', 'admissions', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;

UPDATE "applications" SET
  "acceptanceFeeAmount" = (SELECT (value::jsonb->>'amount')::decimal FROM "site_settings" WHERE key = 'acceptance_fee_policy'),
  "offerIssuedAt" = "updatedAt"
WHERE status = 'ACCEPTED';

UPDATE "applications" SET
  "acceptanceFeeAmount" = 0, "offerResponse" = 'ACCEPTED',
  "offerIssuedAt" = COALESCE("admittedAt", "updatedAt"),
  "offerRespondedAt" = COALESCE("admittedAt", "updatedAt"),
  "clearanceStatus" = 'CLEARED', "clearedAt" = COALESCE("admittedAt", "updatedAt"),
  "clearanceNote" = 'Existing admission preserved during acceptance workflow migration; no retrospective fee charged.'
WHERE status = 'ADMITTED';
