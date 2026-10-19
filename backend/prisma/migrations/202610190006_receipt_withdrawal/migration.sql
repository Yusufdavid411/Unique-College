ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';
CREATE UNIQUE INDEX "payments_active_reference_key" ON "payments"("reference") WHERE "status" IN ('PENDING', 'VERIFIED');
DROP INDEX "payments_reference_key";
CREATE INDEX "payments_reference_idx" ON "payments"("reference");
