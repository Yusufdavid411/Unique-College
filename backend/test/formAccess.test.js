import test from "node:test";
import assert from "node:assert/strict";
import { formAccessFor } from "../src/services/formAccess.js";

test("form requires an exact verified application payment in NGN", () => {
  const application = { formFeeAmount: "5000.00", payments: [] };
  assert.equal(formAccessFor(application).unlocked, false);
  const payment = { type: "APPLICATION_FEE", status: "VERIFIED", currency: "NGN", amount: "5000" };
  assert.equal(formAccessFor({ ...application, payments: [payment] }).unlocked, true);
  for (const change of [{ status: "PENDING" }, { status: "REJECTED" }, { amount: "4999.99" }, { currency: "USD" }, { type: "SCHOOL_FEE" }]) {
    assert.equal(formAccessFor({ ...application, payments: [{ ...payment, ...change }] }).unlocked, false);
  }
});

test("explicit free forms and legacy applications remain accessible", () => {
  assert.equal(formAccessFor({ formFeeAmount: 0 }).unlocked, true);
  assert.equal(formAccessFor({ formFeeAmount: null }).unlocked, true);
});
