import test from "node:test";
import assert from "node:assert/strict";
import { createPendingPayment } from "../src/services/paymentSubmission.js";

test("pending receipts block new submissions across payment types", async () => {
  let created = false;
  const database = { $transaction: async (callback, options) => {
    assert.equal(options.isolationLevel, "Serializable");
    return callback({ payment: { findFirst: async () => ({ id: "pending" }), create: async () => { created = true; } } });
  } };
  await assert.rejects(createPendingPayment(database, "application", { type: "OTHER" }), (error) => error.statusCode === 409);
  assert.equal(created, false);
});

test("resolved receipts permit another submission but a verified form fee cannot be paid twice", async () => {
  const database = { $transaction: async (callback) => callback({ payment: { findFirst: async (query) => query.where.status === "VERIFIED" ? { id: "verified" } : null, create: async ({ data }) => data } }) };
  await assert.rejects(createPendingPayment(database, "application", { type: "APPLICATION_FEE" }), (error) => error.statusCode === 409);
  assert.equal((await createPendingPayment(database, "application", { type: "ACCEPTANCE_FEE" })).applicationId, "application");
});

test("concurrent receipt writes return a conflict instead of silently duplicating", async () => {
  const database = { $transaction: async () => { throw Object.assign(new Error("serialization conflict"), { code: "P2034" }); } };
  await assert.rejects(createPendingPayment(database, "application", {}), (error) => error.statusCode === 409);
});
