import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import { schoolSettingKeys, schoolSettingsPatchSchema } from "../src/services/schoolSettings.js";
import { schoolInfoFromSettings, schoolSettingsSections } from "../../frontend/src/data/schoolSettings.js";

test("labelled school fields match the API whitelist and reject configuration injection", () => {
  assert.deepEqual(schoolSettingsSections.flatMap((section) => section.fields.map((field) => field.key)).sort(), [...schoolSettingKeys].sort());
  for (const changes of [{}, { JWT_SECRET: "private" }, { admissions_policy: "bad" }, { website: "javascript:alert(1)" }, { contact_email: "invalid" }, { address: "" }]) assert.equal(schoolSettingsPatchSchema.safeParse(changes).success, false);
  assert.equal(schoolSettingsPatchSchema.safeParse({ website: "www.uniquecollegekwali.com", address: "Updated campus address" }).success, true);
});

test("saved school details map to website fields and update fallback descriptive copy", () => {
  const school = schoolInfoFromSettings({ address: "New campus address", approval: "Updated approval statement", registration_number: "RC-NEW", contact_phone: "12345, 67890" });
  assert.equal(school.address, "New campus address");
  assert.equal(school.approval, "Updated approval statement");
  assert.ok(school.about.includes("New campus address"));
  assert.ok(school.identity.includes("RC-NEW"));
  assert.deepEqual(school.phones, ["12345", "67890"]);
});

test("school updates are permission-protected, audited and published without exposing internal settings", async () => {
  const original = { user: prisma.user.findUnique, list: prisma.siteSetting.findMany, lookup: prisma.siteSetting.findUnique, transaction: prisma.$transaction };
  let settings = new Map([["address", "Original campus address"], ["approval", "Existing approval"], ["private_service_secret", "never-public"], ["admissions_policy", JSON.stringify({ open: true, message: "Admissions open", applicationFee: 20000, paymentInstructions: "Legacy bank instructions" })]]);
  let failAudit = false;
  let audits = 0;
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/settings`;
  const token = (id) => jwt.sign({ sub: id, version: 0 }, env.jwtSecret);
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token("admin")}` };
  const rows = (source) => [...source].map(([key, value]) => ({ key, value }));
  try {
    prisma.user.findUnique = async ({ where }) => ({ id: where.id, name: "Settings editor", role: where.id === "admin" ? "ADMIN" : "APPLICANT", isActive: true, sessionVersion: 0 });
    prisma.siteSetting.findMany = async () => rows(settings);
    prisma.siteSetting.findUnique = async ({ where }) => settings.has(where.key) ? { key: where.key, value: settings.get(where.key) } : null;
    prisma.$transaction = async (callback) => {
      const pending = new Map(settings);
      const result = await callback({ siteSetting: { upsert: async ({ where, create, update }) => { const value = pending.has(where.key) ? update.value : create.value; pending.set(where.key, value); return { id: where.key, key: where.key, value }; }, findMany: async () => rows(pending) }, auditLog: { create: async () => { if (failAudit) throw new Error("Audit persistence failed"); } } });
      settings = pending;
      audits++;
      return result;
    };
    const publicProfile = await fetch(base + "/school");
    assert.equal(publicProfile.status, 200);
    assert.equal(publicProfile.headers.get("cache-control"), "no-store");
    const profile = (await publicProfile.json()).data;
    assert.equal(profile.address, "Original campus address");
    assert.equal(profile.private_service_secret, undefined);
    assert.equal(profile.admissions_policy, undefined);
    assert.equal((await fetch(base + "/school", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: "Updated address" }) })).status, 401);
    assert.equal((await fetch(base + "/school", { method: "PATCH", headers: { ...headers, Authorization: `Bearer ${token("applicant")}` }, body: JSON.stringify({ address: "Updated address" }) })).status, 403);
    const changed = await fetch(base + "/school", { method: "PATCH", headers, body: JSON.stringify({ address: "Updated campus address", approval: "Updated approval" }) });
    assert.equal(changed.status, 200);
    assert.equal((await changed.json()).data.address, "Updated campus address");
    assert.equal(settings.get("approval"), "Updated approval");
    assert.equal(audits, 1);
    failAudit = true;
    assert.equal((await fetch(base + "/school", { method: "PATCH", headers, body: JSON.stringify({ address: "Must roll back" }) })).status, 500);
    assert.equal(settings.get("address"), "Updated campus address");
    failAudit = false;
    const policy = { open: true, message: "Admissions are open", applicationFee: 20000 };
    assert.equal((await fetch(base + "/admissions", { method: "PUT", headers, body: JSON.stringify(policy) })).status, 200);
    assert.equal(JSON.parse(settings.get("admissions_policy")).paymentInstructions, undefined);
    const published = (await (await fetch(base + "/admissions")).json()).data;
    assert.equal(published.applicationFee, 20000);
    assert.equal(published.paymentInstructions, undefined);
  } finally {
    prisma.user.findUnique = original.user;
    prisma.siteSetting.findMany = original.list;
    prisma.siteSetting.findUnique = original.lookup;
    prisma.$transaction = original.transaction;
    await new Promise((resolve) => server.close(resolve));
  }
});
