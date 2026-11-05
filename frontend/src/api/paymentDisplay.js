export const PAYMENT_SUCCESS_DURATION = 5 * 60 * 1000;

export function paymentSuccessExpiry(payment) {
  if (payment.status !== "VERIFIED") return 0;
  const timestamp = Date.parse(payment.verifiedAt || payment.paidAt || payment.createdAt);
  return Number.isFinite(timestamp) ? timestamp + PAYMENT_SUCCESS_DURATION : 0;
}

export function showPaymentSuccess(payments, type, amount, now) {
  return payments.some((payment) => payment.type === type && payment.currency === "NGN" &&
    Number(payment.amount) === Number(amount) && paymentSuccessExpiry(payment) > now);
}
