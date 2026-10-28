ALTER TABLE "payments"
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "providerTransactionId" TEXT,
ADD COLUMN "checkoutUrl" TEXT,
ADD COLUMN "checkoutStartedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "payments_providerTransactionId_key" ON "payments"("providerTransactionId");
