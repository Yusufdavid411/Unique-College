import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../src/config/prisma.js";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { requestPasswordReset, completePasswordReset } from "../src/services/passwordReset.js";

test("real PostgreSQL reset is atomic, single-use and invalidates authenticated sessions", { skip: !process.env.INTEGRATION_DATABASE_URL, timeout: 120000 }, async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /test/i);
  const marker = crypto.randomUUID();
  let user;
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  const post = (path, data, token) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(data) });
  try {
    user = await prisma.user.create({ data: { email: `${marker}@reset.invalid`, name: "Recovery fixture", role: "APPLICANT", passwordHash: "not-a-login-password" } });
    const session = jwt.sign({ sub: user.id, version: 0 }, env.jwtSecret);
    assert.equal((await post("/forgot-password", { email: user.email })).status, 503);
    assert.equal((await post("/forgot-password", {})).status, 422);
    assert.equal((await post("/send-password-reset", { email: user.email })).status, 401);
    assert.equal((await post("/send-password-reset", { email: user.email }, session)).status, 403);
    let token;
    await requestPasswordReset(user.email, { database: prisma, configuration: { RESEND_API_KEY: "fixture", RESEND_FROM_EMAIL: "fixture@example.com" }, request: async (url, request) => {
      token = JSON.parse(request.body).text.match(/#([a-f0-9]{64})/)[1];
      return { ok: true, json: async () => ({ id: "fixture" }) };
    } });
    await assert.rejects(() => completePasswordReset(token, "NewFixturePassword2027", { database: { $transaction: (operation) => prisma.$transaction((transaction) => operation({ ...transaction, auditLog: { create: async () => { throw new Error("Fixture audit failure"); } } })) } }), /Fixture audit failure/);
    assert.equal((await prisma.user.findUnique({ where: { id: user.id } })).sessionVersion, 0);
    assert.equal(await prisma.passwordReset.count({ where: { userId: user.id } }), 1);
    const results = await Promise.all([post("/reset-password", { token, password: "NewFixturePassword2027" }), post("/reset-password", { token, password: "NewFixturePassword2027" })]);
    assert.deepEqual(results.map((response) => response.status).sort(), [200, 400]);
    assert.equal((await prisma.user.findUnique({ where: { id: user.id } })).sessionVersion, 1);
    assert.equal(await prisma.passwordReset.count({ where: { userId: user.id } }), 0);
    assert.equal((await fetch(base + "/me", { headers: { Authorization: `Bearer ${session}` } })).status, 401);
    assert.equal((await post("/applicant/login", { identifier: user.email, password: "NewFixturePassword2027" })).status, 200);
  } finally {
    if (user) {
      await prisma.auditLog.deleteMany({ where: { targetId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
});
