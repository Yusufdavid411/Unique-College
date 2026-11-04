import test from "node:test";
import assert from "node:assert/strict";
import { PAYMENT_SUCCESS_DURATION, paymentSuccessExpiry, showPaymentSuccess } from "../../frontend/src/api/paymentDisplay.js";

test("each paid fee confirmation expires one hour after verification without altering history", () => {
  const verifiedAt = "2026-11-04T10:00:00Z";
  const start = Date.parse(verifiedAt);
  for (const type of ["APPLICATION_FEE", "SCREENING_FEE", "ACCEPTANCE_FEE"]) {
    const payment = { type, status: "VERIFIED", currency: "NGN", amount: "5000", verifiedAt };
    const history = [payment];
    assert.equal(showPaymentSuccess(history, type, 5000, start), true);
    assert.equal(showPaymentSuccess(history, type, 5000, start + PAYMENT_SUCCESS_DURATION - 1), true);
    assert.equal(showPaymentSuccess(history, type, 5000, start + PAYMENT_SUCCESS_DURATION), false);
    assert.equal(showPaymentSuccess(history, type, 4999, start), false);
    assert.equal(showPaymentSuccess([{ ...payment, status: "PENDING" }], type, 5000, start), false);
    assert.equal(paymentSuccessExpiry({ ...payment, verifiedAt: null, paidAt: verifiedAt }), start + PAYMENT_SUCCESS_DURATION);
    assert.equal(paymentSuccessExpiry({ ...payment, verifiedAt: "invalid" }), 0);
    assert.equal(history.length, 1);
    assert.equal(history[0].status, "VERIFIED");
  }
  assert.equal(showPaymentSuccess([], "APPLICATION_FEE", 0, start), false);
});
