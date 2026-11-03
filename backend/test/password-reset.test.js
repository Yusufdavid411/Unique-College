import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { requestPasswordReset, completePasswordReset, passwordResetUrl, resetPasswordSchema } from "../src/services/passwordReset.js";

const now = new Date("2026-11-03T10:00:00Z");
function fixture({ active = true, version = 2 } = {}) {
  let reset = null;
  const user = { id: "user", email: "person@example.com", role: "APPLICANT", isActive: active, sessionVersion: version };
  const events = [];
  const transaction = {
    $queryRaw: async () => [],
    user: { findUnique: async ({ where }) => where.email === user.email ? user : null, updateMany: async ({ where, data }) => {
      if (!user.isActive || where.sessionVersion !== user.sessionVersion) return { count: 0 };
      user.passwordHash = data.passwordHash; user.sessionVersion += 1; user.mustChangePassword = false; return { count: 1 };
    } },
    passwordReset: {
      findUnique: async ({ where }) => reset && (where.userId === reset.userId || where.tokenHash === reset.tokenHash) ? reset : null,
      upsert: async ({ create, update }) => { reset = reset ? { ...reset, ...update } : create; },
      deleteMany: async ({ where }) => { if (!reset || reset.tokenHash !== where.tokenHash || (where.expiresAt && reset.expiresAt <= where.expiresAt.gt)) return { count: 0 }; reset = null; return { count: 1 }; }
    },
    auditLog: { create: async ({ data }) => { events.push(data); } }
  };
  const database = { ...transaction, $transaction: async (callback) => callback(transaction) };
  let mail;
  const options = { database, now, configuration: { RESEND_API_KEY: "dummy", RESEND_FROM_EMAIL: "School <school@example.com>" }, request: async (url, request) => { mail = JSON.parse(request.body); return { ok: true, json: async () => ({ id: "message" }) }; } };
  return { user, options, events, get reset() { return reset; }, get mail() { return mail; } };
}

test("recovery stores only hash, emails canonical single-use link and revokes sessions", async () => {
  const state = fixture();
  await requestPasswordReset(state.user.email, state.options);
  const token = state.mail.text.match(/#([a-f0-9]{64})/)[1];
  assert.notEqual(state.reset.tokenHash, token);
  assert.equal(state.reset.tokenHash, crypto.createHash("sha256").update(token).digest("hex"));
  assert.equal(state.reset.expiresAt.getTime() - now.getTime(), 1800000);
  await completePasswordReset(token, "StrongPassword2027", state.options);
  assert.equal(state.user.sessionVersion, 3);
  assert.equal(await bcrypt.compare("StrongPassword2027", state.user.passwordHash), true);
  assert.equal(state.reset, null);
  assert.equal(state.events.at(-1).action, "user.password_reset_completed");
  await assert.rejects(() => completePasswordReset(token, "AnotherPassword2027", state.options), /invalid or expired/);
});

test("missing/inactive accounts send no email and missing service is explicit", async () => {
  for (const state of [fixture(), fixture({ active: false })]) {
    await requestPasswordReset("missing@example.com", state.options);
    await requestPasswordReset(state.user.email, { ...state.options, configuration: {} }).then(() => assert.fail(), (error) => assert.equal(error.statusCode, 503));
    if (!state.user.isActive) await requestPasswordReset(state.user.email, state.options);
    assert.equal(state.mail, undefined);
  }
});

test("cooldown and failed delivery do not create usable duplicate links", async () => {
  const state = fixture();
  await requestPasswordReset(state.user.email, state.options);
  const hash = state.reset.tokenHash;
  await requestPasswordReset(state.user.email, state.options);
  assert.equal(state.reset.tokenHash, hash);
  await requestPasswordReset(state.user.email, { ...state.options, now: new Date(now.getTime() + 61000), request: async () => ({ ok: false }) });
  assert.equal(state.reset, null);
});

test("expired and session-invalidated links fail", async () => {
  for (const expired of [true, false]) {
    const state = fixture();
    await requestPasswordReset(state.user.email, state.options);
    const token = state.mail.text.match(/#([a-f0-9]{64})/)[1];
    if (!expired) state.user.sessionVersion += 1;
    await assert.rejects(() => completePasswordReset(token, "StrongPassword2027", { ...state.options, now: expired ? new Date(now.getTime() + 1800001) : now }), /invalid or expired/);
    assert.equal(state.user.passwordHash, undefined);
  }
});

test("password policy and portal origins cannot be overridden by request input", () => {
  assert.equal(resetPasswordSchema.safeParse("weakpassword").success, false);
  assert.equal(resetPasswordSchema.safeParse("StrongPassword2027").success, true);
  assert.equal(passwordResetUrl("ADMIN", "token"), "https://admin.uniquecollegekwali.com/reset-password#token");
  assert.equal(passwordResetUrl("STUDENT", "token"), "https://portal.uniquecollegekwali.com/reset-password#token");
  assert.equal(passwordResetUrl("STAFF", "token"), "https://staff.uniquecollegekwali.com/reset-password#token");
});
