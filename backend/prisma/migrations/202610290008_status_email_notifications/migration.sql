ALTER TABLE "application_status_history"
ADD COLUMN "emailStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN "emailRecipient" TEXT,
ADD COLUMN "emailAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "emailLastAttemptAt" TIMESTAMP(3),
ADD COLUMN "emailSentAt" TIMESTAMP(3),
ADD COLUMN "emailError" TEXT;

CREATE INDEX "application_status_history_emailStatus_emailLastAttemptAt_idx"
ON "application_status_history"("emailStatus", "emailLastAttemptAt");
