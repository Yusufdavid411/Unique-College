import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import { passwordValidationMessage } from "../../frontend/src/api/passwordPolicy.js";

test("password policy explains the missing requirement before submitting", () => {
  assert.match(passwordValidationMessage("lowercasepassword2027"), /uppercase/);
  assert.match(passwordValidationMessage("UPPERCASEPASSWORD2027"), /lowercase/);
  assert.match(passwordValidationMessage("LongPasswordNoNumbers"), /number/);
  assert.match(passwordValidationMessage("Short1"), /12 characters/);
  assert.match(passwordValidationMessage("Á".repeat(40) + "Password2027"), /too long/);
  assert.equal(passwordValidationMessage("ValidPasswordExample2027"), "");
});

test("account owners can change passwords, receive useful validation and revoke previous sessions", async () => {
  const original = { user: prisma.user.findUnique, transaction: prisma.$transaction };
  const oldPassword = "OriginalPasswordExample2026";
  const nextPassword = "UpdatedPasswordExample2027";
  const state = { id: "password-owner", name: "Account owner", email: "password-test@example.invalid", role: "ADMIN", isActive: true, sessionVersion: 0, mustChangePassword: false, passwordHash: await bcrypt.hash(oldPassword, 12) };
  const oldHash = state.passwordHash;
  const audits = [];
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  const token = jwt.sign({ sub: state.id, version: 0 }, env.jwtSecret);
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  async function change(currentPassword, password) { return fetch(base + "/password", { method: "POST", headers, body: JSON.stringify({ currentPassword, password }) }); }
  try {
    prisma.user.findUnique = async () => structuredClone(state);
    prisma.$transaction = async (callback) => callback({ user: { update: async ({ data }) => { state.passwordHash = data.passwordHash; state.mustChangePassword = data.mustChangePassword; state.sessionVersion += data.sessionVersion.increment; return state; } }, auditLog: { create: async ({ data }) => audits.push(data) } });
    const invalid = await change(oldPassword, "lowercasepassword2027");
    assert.equal(invalid.status, 422);
    assert.match((await invalid.json()).errors.password.join(" "), /uppercase/);
    assert.equal(state.passwordHash, oldHash);
    assert.equal((await change("incorrect-current-password", nextPassword)).status, 400);
    assert.equal((await change(oldPassword, oldPassword)).status, 422);
    assert.equal((await change(oldPassword, nextPassword)).status, 200);
    assert.equal(await bcrypt.compare(nextPassword, state.passwordHash), true);
    assert.equal(state.sessionVersion, 1);
    assert.equal(audits.length, 1);
    assert.equal(audits[0].action, "user.password_changed");
    assert.equal(JSON.stringify(audits).includes(nextPassword), false);
    assert.equal((await fetch(base + "/me", { headers })).status, 401);
    const login = await fetch(base + "/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: state.email, password: nextPassword }) });
    assert.equal(login.status, 200);
  } finally {
    prisma.user.findUnique = original.user;
    prisma.$transaction = original.transaction;
    await new Promise((resolve) => server.close(resolve));
  }
});
