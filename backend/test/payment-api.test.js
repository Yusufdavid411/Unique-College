import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";

test("receipt API blocks pending uploads and protects withdrawal ownership and review state", async () => {
  const original = { user: prisma.user.findUnique, payment: prisma.payment.findFirst, transaction: prisma.$transaction };
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port + "/api/applicant/payments";
  const headers = { Authorization: "Bearer " + jwt.sign({ sub: "owner", version: 0 }, env.jwtSecret) };
  let payment = { id: "receipt", applicationId: "application", status: "PENDING", updatedAt: new Date() };
  let changed = true;
  const audit = [];
  try {
    prisma.user.findUnique = async () => ({ id: "owner", role: "APPLICANT", isActive: true, sessionVersion: 0 });
    prisma.payment.findFirst = async (query) => {
      assert.equal(query.where.application.applicantId, "owner");
      return payment;
    };
    prisma.$transaction = async (callback) => callback({
      payment: {
        updateMany: async (query) => {
          assert.equal(query.where.status, payment.status);
          assert.equal(query.data.status, "CANCELLED");
          return { count: changed ? 1 : 0 };
        },
        findUnique: async () => ({ ...payment, status: "CANCELLED" })
      },
      auditLog: { create: async ({ data }) => audit.push(data) }
    });
    const blocked = await fetch(base, { method: "POST", headers });
    assert.equal(blocked.status, 409);
    assert.match((await blocked.json()).message, /awaiting review/i);
    const removed = await fetch(base + "/receipt", { method: "DELETE", headers });
    assert.equal(removed.status, 200);
    assert.equal((await removed.json()).data.status, "CANCELLED");
    assert.equal(audit[0].action, "payment.withdrawn");
    assert.equal(audit[0].actorId, "owner");
    payment = { ...payment, status: "REJECTED" };
    assert.equal((await fetch(base + "/receipt", { method: "DELETE", headers })).status, 200);
    changed = false;
    assert.equal((await fetch(base + "/receipt", { method: "DELETE", headers })).status, 409);
    assert.equal(audit.length, 2);
    payment = { ...payment, status: "VERIFIED" };
    assert.equal((await fetch(base + "/receipt", { method: "DELETE", headers })).status, 409);
    payment = { ...payment, status: "PENDING", provider: "FLUTTERWAVE" };
    const automatic = await fetch(base + "/receipt", { method: "DELETE", headers });
    assert.equal(automatic.status, 409);
    assert.match((await automatic.json()).message, /cannot be withdrawn/);
    payment = null;
    assert.equal((await fetch(base + "/someone-elses-receipt", { method: "DELETE", headers })).status, 404);
  } finally {
    prisma.user.findUnique = original.user;
    prisma.payment.findFirst = original.payment;
    prisma.$transaction = original.transaction;
    await new Promise((resolve) => server.close(resolve));
  }
});
