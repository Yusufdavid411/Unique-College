import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";

test("API rejects anonymous and revoked sessions and isolates database outages", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const original = prisma.user.findUnique;
  try {
    const anonymous = await fetch(base + "/api/audit");
    assert.equal(anonymous.status, 401);
    const token = jwt.sign({ sub: "test-user", version: 0 }, env.jwtSecret);
    const headers = { Authorization: "Bearer " + token };
    prisma.user.findUnique = async () => ({ id: "test-user", role: "STAFF", isActive: true, sessionVersion: 1 });
    assert.equal((await fetch(base + "/api/audit", { headers })).status, 401);
    prisma.user.findUnique = async () => { throw Object.assign(new Error("private database details"), { code: "P1001" }); };
    const outage = await fetch(base + "/api/audit", { headers });
    assert.equal(outage.status, 503);
    assert.equal((await outage.text()).includes("private database details"), false);
    prisma.user.findUnique = async () => ({ id: "test-user", role: "STAFF", isActive: true, sessionVersion: 0, roleAssignments: [] });
    assert.equal((await fetch(base + "/api/audit", { headers })).status, 403);
    prisma.user.findUnique = async () => ({ id: "test-user", role: "ADMIN", isActive: true, sessionVersion: 0, mustChangePassword: true });
    const temporary = await fetch(base + "/api/audit", { headers });
    assert.equal(temporary.status, 403);
    assert.equal((await temporary.json()).code, "PASSWORD_CHANGE_REQUIRED");
    assert.equal((await fetch(base + "/api/auth/me", { headers })).status, 200);
  } finally {
    prisma.user.findUnique = original;
    await new Promise((resolve) => server.close(resolve));
  }
});
