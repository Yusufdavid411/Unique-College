import { Prisma } from "@prisma/client";

export function demoPaymentsEnabled(configuration = process.env) {
  return configuration.PAYMENT_PROVIDER === "flutterwave" &&
    configuration.FLUTTERWAVE_MODE === "test" &&
    configuration.FLUTTERWAVE_RESTRICTED_PRODUCTION_TEST === "true";
}

export function feeVerified(application, type, amount) {
  if (amount == null) return false;
  const quote = new Prisma.Decimal(amount);
  return quote.equals(0) || (application.payments || []).some((payment) =>
    payment.type === type && payment.status === "VERIFIED" && payment.currency === "NGN" &&
    (Boolean(payment.isTest) === Boolean(application.isTest) ||
      (!application.isTest && payment.isTest && payment.provider === "FLUTTERWAVE" && demoPaymentsEnabled())) &&
    quote.equals(payment.amount));
}
