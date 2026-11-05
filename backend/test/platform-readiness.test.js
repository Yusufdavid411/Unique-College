import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { environmentReadiness, platformReadiness } from "../src/services/platformReadiness.js";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import { validMaintenanceSecret } from "../src/routes/maintenanceRoutes.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

const live = { enabled: true, secretKey: "FLWSECK-fixture-only", webhookHash: "fixture-only", mode: "live", returnUrl: "https://apply.uniquecollegekwali.com/payments" };
test("readiness reports configuration honestly and never returns credentials", () => {
  const configuration = { RESEND_API_KEY: "private-resend-key", RESEND_FROM_EMAIL: "Admissions <no-reply@uniquecollegekwali.com>", STORAGE_PROVIDER: "blob", BLOB_READ_WRITE_TOKEN: "private-blob-token", CRON_SECRET: "private-cron-secret".repeat(3) };
  const checks = environmentReadiness(configuration, live);
  assert.ok(checks.every((check) => check.status === "CONFIGURED" && check.verifiedExternally === false));
  for (const secret of [configuration.RESEND_API_KEY, configuration.BLOB_READ_WRITE_TOKEN, configuration.CRON_SECRET, live.secretKey]) assert.ok(!JSON.stringify(checks).includes(secret));
  assert.equal(environmentReadiness({}, { ...live, mode: "test", secretKey: "FLWSECK_TEST-fixture" }).find((check) => check.id === "payments").status, "CONFIGURED");
  assert.equal(environmentReadiness({ ...configuration, RESEND_FROM_EMAIL: "wrong@example.com" }, live).find((check) => check.id === "email").status, "ACTION_REQUIRED");
  assert.equal(environmentReadiness({ VERCEL: "1", STORAGE_PROVIDER: "local" }, live).find((check) => check.id === "storage").status, "ACTION_REQUIRED");
});

test("readiness survives database failures without leaking private diagnostics", async () => {
  const report = await platformReadiness({ database: { $queryRaw: async () => { throw new Error("postgresql://private-credentials"); } }, configuration: {}, payment: live, access: async () => {} });
  assert.equal(report.readyForActivationReview, false);
  assert.equal(report.checks.find((check) => check.id === "database").status, "ACTION_REQUIRED");
  assert.ok(!JSON.stringify(report).includes("private-credentials"));
});

test("letter readiness tells the admin every missing official field without guessing values", async () => {
  const report = await platformReadiness({ database: { $queryRaw: async () => [], siteSetting: { findUnique: async () => null }, applicationStatusHistory: { count: async () => 0 } }, configuration: {}, payment: live, access: async () => {} });
  const letters = report.checks.find((check) => check.id === "letters");
  assert.equal(letters.status, "ACTION_REQUIRED");
  for (const field of ["academic session", "programme duration", "registration deadline", "lectures start date"]) assert.ok(letters.message.includes(field));
  assert.ok(!letters.message.includes("fee appendix"));
});

test("interrupted database requests give safe actionable errors without internal details", () => {
  for (const code of ["P1017", "P2024", "P2028"]) {
    let status;
    let body;
    errorHandler({ code, message: "private database diagnostics" }, {}, { status: (value) => { status = value; return { json: (value) => { body = value; } }; } }, () => assert.fail("Should handle interruption"));
    assert.equal(status, 503);
    assert.match(body.message, /Refresh your records/);
    assert.ok(!body.message.includes("private"));
  }
});

test("maintenance endpoint rejects missing, short and incorrect secrets", async () => {
  const secret = "a".repeat(48);
  assert.equal(validMaintenanceSecret(`Bearer ${secret}`, secret), true);
  for (const header of [undefined, "Bearer bad", secret, `Bearer ${"b".repeat(48)}`]) assert.equal(validMaintenanceSecret(header, secret), false);
  assert.equal(validMaintenanceSecret("Bearer short", "short"), false);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}/api`;
    for (const path of ["/settings/readiness", "/maintenance/notifications"]) assert.equal((await fetch(base + path)).status, 401);
    const previous = { secret: process.env.CRON_SECRET, key: process.env.RESEND_API_KEY, sender: process.env.RESEND_FROM_EMAIL };
    try {
      process.env.CRON_SECRET = secret;
      process.env.RESEND_API_KEY = "";
      process.env.RESEND_FROM_EMAIL = "";
      const job = await fetch(base + "/maintenance/notifications", { headers: { Authorization: `Bearer ${secret}` } });
      assert.equal(job.status, 200);
      assert.equal((await job.json()).data.configured, false);
      assert.equal(job.headers.get("cache-control"), "no-store");
    } finally {
      for (const [name, value] of [["CRON_SECRET", previous.secret], ["RESEND_API_KEY", previous.key], ["RESEND_FROM_EMAIL", previous.sender]]) {
        if (value === undefined) delete process.env[name]; else process.env[name] = value;
      }
    }
    const original = prisma.user.findUnique;
    try {
      prisma.user.findUnique = async () => ({ id: "staff", role: "STAFF", isActive: true, sessionVersion: 0, roleAssignments: [] });
      const response = await fetch(base + "/settings/readiness", { headers: { Authorization: `Bearer ${jwt.sign({ sub: "staff", version: 0 }, env.jwtSecret)}` } });
      assert.equal(response.status, 403);
    } finally { prisma.user.findUnique = original; }
  } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
});
