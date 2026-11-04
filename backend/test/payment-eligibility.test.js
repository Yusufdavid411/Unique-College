import test from "node:test";
import assert from "node:assert/strict";
import { feeVerified } from "../src/services/paymentEligibility.js";

test("the same verified demo fee unlocks all normal-account stages only while demo mode is enabled", () => {
  const flags = { PAYMENT_PROVIDER: "flutterwave", FLUTTERWAVE_MODE: "test", FLUTTERWAVE_RESTRICTED_PRODUCTION_TEST: "true" };
  const original = Object.fromEntries(Object.keys(flags).map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, flags);
    for (const type of ["APPLICATION_FEE", "SCREENING_FEE", "ACCEPTANCE_FEE"]) {
      const payment = { type, amount: 5000, currency: "NGN", status: "VERIFIED", provider: "FLUTTERWAVE", isTest: true };
      const application = { isTest: false, payments: [payment] };
      assert.equal(feeVerified(application, type, 5000), true);
      for (const change of [{ amount: 4999 }, { currency: "USD" }, { status: "PENDING" }, { provider: "MANUAL" }]) assert.equal(feeVerified({ ...application, payments: [{ ...payment, ...change }] }, type, 5000), false);
      process.env.FLUTTERWAVE_MODE = "live";
      assert.equal(feeVerified(application, type, 5000), false);
      assert.equal(payment.isTest, true);
      assert.equal(feeVerified({ ...application, payments: [{ ...payment, isTest: false }] }, type, 5000), true);
      process.env.FLUTTERWAVE_MODE = "test";
    }
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
