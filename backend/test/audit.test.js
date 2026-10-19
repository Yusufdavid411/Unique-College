import test from "node:test";
import assert from "node:assert/strict";
import { auditedMutation } from "../src/services/audit.js";

test("audit and mutation use the same transaction and exclude arbitrary data", async () => {
  const writes = [];
  const transaction = { auditLog: { create: async (record) => writes.push(record.data) } };
  const database = { $transaction: (operation) => operation(transaction) };
  const result = await auditedMutation(database, {
    actorId: "admin-id", action: "role.created", targetType: "role", password: "must-not-be-recorded"
  }, async (receivedTransaction) => {
    assert.equal(receivedTransaction, transaction);
    return { id: "role-id", name: "Registrar" };
  });
  assert.equal(result.id, "role-id");
  assert.deepEqual(writes, [{ actorId: "admin-id", action: "role.created", targetType: "role", targetId: "role-id" }]);
});

test("audit failure propagates out of the transaction", async () => {
  const transaction = { auditLog: { create: async () => { throw new Error("Audit unavailable"); } } };
  const database = { $transaction: (operation) => operation(transaction) };
  await assert.rejects(auditedMutation(database, { actorId: "admin-id", action: "payment.review:VERIFIED", targetType: "payment", targetId: "payment-id" }, async () => ({ id: "payment-id" })), /Audit unavailable/);
});

test("a failed mutation does not produce a successful audit entry", async () => {
  let auditWritten = false;
  const transaction = { auditLog: { create: async () => { auditWritten = true; } } };
  const database = { $transaction: (operation) => operation(transaction) };
  await assert.rejects(auditedMutation(database, {}, async () => { throw new Error("Mutation rejected"); }), /Mutation rejected/);
  assert.equal(auditWritten, false);
});
