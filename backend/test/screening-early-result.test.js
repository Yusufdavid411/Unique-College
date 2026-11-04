import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";

test("early results require explicit permission and confirmation, preserve payment checks and record the override", async () => {
  const original = { user: prisma.user.findUnique, transaction: prisma.$transaction, key: process.env.RESEND_API_KEY, sender: process.env.RESEND_FROM_EMAIL };
  process.env.RESEND_API_KEY = "";
  process.env.RESEND_FROM_EMAIL = "";
  const id = crypto.randomUUID();
  const audits = [];
  const history = [];
  const base = { id, fullName: "Sample applicant", email: "fixture@example.invalid", status: "INTERVIEW_SCHEDULED", screeningStatus: "SCHEDULED", screeningAt: new Date(Date.now() + 86400000), screeningFeeAmount: 0, formFeeAmount: 0, submittedAt: new Date(), payments: [] };
  let record = { ...base };
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const body = { outcome: "PASSED", score: 75, publishBeforeExam: true };
  const call = (user, data = body) => fetch(`http://127.0.0.1:${server.address().port}/api/screening/${id}/result`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt.sign({ sub: user, version: 0 }, env.jwtSecret)}` }, body: JSON.stringify(data) });
  try {
    prisma.user.findUnique = async ({ where }) => ({ id: where.id, name: "Fixture admin", isActive: true, sessionVersion: 0, role: where.id === "admin" ? "ADMIN" : "STAFF", roleAssignments: [{ role: { permissions: ["applications.admit", ...(where.id === "early-staff" ? ["screening.results.publish_early"] : [])] } }] });
    prisma.$transaction = async (callback) => callback({ application: { findUnique: async () => record, update: async ({ data }) => { record = { ...record, ...data }; return record; } }, siteSetting: { findUnique: async () => null }, applicationStatusHistory: { create: async ({ data }) => { history.push(data); return { id: "event" }; } }, auditLog: { create: async ({ data }) => audits.push(data) } });
    assert.equal((await call("admin", { outcome: "PASSED", score: 75 })).status, 409);
    assert.equal((await call("staff")).status, 403);
    assert.equal(audits.length, 0);
    record = { ...base, screeningFeeAmount: 2000 };
    assert.equal((await call("admin")).status, 409);
    record = { ...base };
    assert.equal((await call("admin")).status, 200);
    assert.equal(record.screeningStatus, "PASSED");
    assert.equal(audits[0].action, "screening.result_early:PASSED");
    assert.equal(audits[0].actorId, "admin");
    assert.match(history[0].note, /Early result authorised/);
    assert.ok(history[0].note.includes(base.screeningAt.toISOString()));
    assert.equal((await call("admin", { ...body, outcome: "FAILED" })).status, 409);
    record = { ...base };
    assert.equal((await call("early-staff")).status, 200);
    assert.equal(audits.at(-1).action, "screening.result_early:PASSED");
    record = { ...base, screeningAt: new Date(Date.now() - 60000) };
    assert.equal((await call("staff", { outcome: "PASSED", score: 75 })).status, 200);
    assert.equal(audits.at(-1).action, "screening.result:PASSED");
  } finally {
    prisma.user.findUnique = original.user;
    prisma.$transaction = original.transaction;
    for (const [key, value] of [["RESEND_API_KEY", original.key], ["RESEND_FROM_EMAIL", original.sender]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
