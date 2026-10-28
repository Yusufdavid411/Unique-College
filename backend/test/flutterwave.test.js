import test from "node:test";
import assert from "node:assert/strict";
import { flutterwaveService, assertVerifiedTransaction, validWebhookHash, publicPaymentConfiguration } from "../src/services/flutterwave.js";
import { formAccessFor } from "../src/services/formAccess.js";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import jwt from "jsonwebtoken";

const config = { enabled: true, secretKey: "test-secret-not-a-real-key", webhookHash: "test-webhook-hash", returnUrl: "https://apply.uniquecollegekwali.com/payments" };

function fixture() {
  const audit = [];
  const requests = [];
  const application = { id: "application", applicantId: "owner", formFeeAmount: "20000", email: "applicant@example.test", fullName: "Test Applicant", phoneNumber: "08000000000", payments: [] };
  const database = {
    application: { findUnique: async () => application },
    payment: {
      create: async ({ data }) => { const payment = { id: "payment", status: "PENDING", checkoutUrl: null, checkoutStartedAt: null, ...data, application: { applicantId: "owner" } }; application.payments.push(payment); return payment; },
      findFirst: async ({ where }) => application.payments.find((payment) => (!where.reference || payment.reference === where.reference) && (!where.application || where.application.applicantId === "owner")) || null,
      findUnique: async () => application.payments[0],
      updateMany: async ({ where, data }) => {
        const payment = application.payments.find((item) => item.id === where.id && item.status === where.status);
        if (!payment || (where.OR && payment.checkoutStartedAt)) return { count: 0 };
        Object.assign(payment, data);
        return { count: 1 };
      }
    },
    auditLog: { create: async ({ data }) => audit.push(data) }
  };
  database.$transaction = async (callback) => callback(database);
  let providerResult;
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith("/payments")) return { ok: true, json: async () => ({ status: "success", data: { link: "https://checkout.flutterwave.com/v3/hosted/pay/test" } }) };
    return { ok: true, json: async () => ({ status: "success", data: providerResult || { id: 123, tx_ref: application.payments[0].reference, currency: "NGN", amount: 20000, status: "successful" } }) };
  };
  return { application, database, audit, requests, fetcher, setProviderResult: (result) => { providerResult = result; } };
}

test("Flutterwave uses stored quotes, reuses checkout and unlocks once with replay-safe verification", async () => {
  const state = fixture();
  const service = flutterwaveService(state.database, state.fetcher, config);
  const first = await service.start("owner");
  const second = await service.start("owner");
  assert.equal(first.reference, second.reference);
  assert.equal(state.application.payments.length, 1);
  assert.equal(state.requests.length, 1);
  const payload = JSON.parse(state.requests[0].options.body);
  assert.equal(payload.amount, "20000");
  assert.equal(payload.currency, "NGN");
  assert.equal(payload.customer.email, state.application.email);
  assert.equal(payload.redirect_url, config.returnUrl);
  assert.match(payload.payload_hash, /^[0-9a-f]{64}$/);
  assert.equal(formAccessFor(state.application).unlocked, false);
  const result = await service.verify(first.reference, "owner");
  assert.equal(result.status, "VERIFIED");
  assert.equal(formAccessFor(state.application).unlocked, true);
  await service.verify(first.reference, "owner");
  await service.webhook({ event: "charge.completed", data: { id: 123, status: "successful" } });
  assert.equal(state.audit.filter((event) => event.action === "payment.flutterwave.verified").length, 1);
  await assert.rejects(service.start("owner"), /already verified/);
  await assert.rejects(service.verify(first.reference, "other-applicant"), /not found/);
});

test("redirect or webhook claims never bypass provider verification, including wrong amount or currency", async () => {
  const state = fixture();
  const service = flutterwaveService(state.database, state.fetcher, config);
  const { reference } = await service.start("owner");
  for (const invalid of [{ amount: 1 }, { amount: "invalid" }, { currency: "USD" }, { tx_ref: "some-other-reference" }, { id: "invalid" }]) {
    state.setProviderResult({ id: 123, tx_ref: reference, amount: 20000, currency: "NGN", status: "successful", ...invalid });
    await assert.rejects(service.verify(reference, "owner"));
    assert.equal(formAccessFor(state.application).unlocked, false);
  }
  state.setProviderResult({ id: 123, tx_ref: reference, amount: 20000, currency: "NGN", status: "failed" });
  const result = await service.webhook({ event: "charge.completed", data: { id: 123, status: "successful" } });
  assert.equal(result.status, "PENDING");
  assert.equal(formAccessFor(state.application).unlocked, false);
  assert.equal(state.audit.length, 1);
});

test("payment sessions fail closed, block duplicate/manual payments, and hold checkout preparation locks", async () => {
  const state = fixture();
  const disabled = flutterwaveService(state.database, state.fetcher, { ...config, secretKey: "" });
  await assert.rejects(disabled.start("owner"), /not available/);
  const service = flutterwaveService(state.database, state.fetcher, config);
  state.application.payments.push({ id: "legacy", status: "PENDING", provider: "MANUAL" });
  await assert.rejects(service.start("owner"), /receipt is awaiting review/);
  state.application.payments.length = 0;
  const timeout = flutterwaveService(state.database, async () => { throw new Error("private secret response"); }, config);
  await assert.rejects(timeout.start("owner"), /temporarily unavailable/);
  assert.equal(state.application.payments.length, 1);
  assert.equal(state.application.payments[0].status, "PENDING");
  await assert.rejects(service.start("owner"), /being prepared/);
  assert.equal(state.application.payments.length, 1);
});

test("webhook secret comparisons reject absent or forged signatures and configuration exposes no secrets", () => {
  assert.equal(validWebhookHash(undefined, config.webhookHash), false);
  assert.equal(validWebhookHash("", ""), false);
  assert.equal(validWebhookHash("forged", config.webhookHash), false);
  assert.equal(validWebhookHash(config.webhookHash, config.webhookHash), true);
  assert.deepEqual(Object.keys(publicPaymentConfiguration()).sort(), ["provider", "ready"]);
  assert.throws(() => assertVerifiedTransaction({ reference: "ref", amount: "20000", currency: "NGN" }, { id: 123, tx_ref: "ref", amount: 0, currency: "NGN", status: "successful" }));
});

test("gateway routes reject unauthenticated payment attempts and unsigned webhooks", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/payments/flutterwave`;
  try {
    for (const path of ["checkout", "verify", "webhook"]) {
      assert.equal((await fetch(`${base}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 401);
    }
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test("admin cannot override an automatic payment, even with payment-review permission", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const originalUser = prisma.user.findUnique;
  const originalPayment = prisma.payment.findFirst;
  try {
    prisma.user.findUnique = async () => ({ id: "admin", role: "ADMIN", isActive: true, sessionVersion: 0 });
    prisma.payment.findFirst = async () => ({ id: "payment", provider: "FLUTTERWAVE", status: "PENDING" });
    const token = jwt.sign({ sub: "admin", version: 0 }, env.jwtSecret);
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/applications/11111111-1111-4111-8111-111111111111/payments/22222222-2222-4222-8222-222222222222`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status: "VERIFIED" })
    });
    assert.equal(response.status, 409);
    assert.match((await response.json()).message, /cannot be overridden/);
  } finally {
    prisma.user.findUnique = originalUser;
    prisma.payment.findFirst = originalPayment;
    await new Promise((resolve) => server.close(resolve));
  }
});
