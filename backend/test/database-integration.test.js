import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { auditedMutation } from "../src/services/audit.js";
import { permissionsFor, roleInclude } from "../src/services/permissions.js";

test("PostgreSQL persists role assignments and rolls back a change when auditing fails", { skip: !process.env.INTEGRATION_DATABASE_URL }, async () => {
  const connection = process.env.INTEGRATION_DATABASE_URL;
  const databaseName = new URL(connection).pathname;
  assert.match(databaseName, /test/i, "Use a dedicated database with test in its name");
  const database = new PrismaClient({ datasources: { db: { url: connection } } });
  const actorId = crypto.randomUUID();
  const email = actorId + "@integration.invalid";
  const failedEmail = "failed-" + email;
  let roleId;
  let userId;
  try {
    const user = await auditedMutation(database, { actorId, action: "test.staff_created", targetType: "user" }, (transaction) => transaction.user.create({ data: { name: "Integration staff", email, passwordHash: "integration-only-no-login", role: "STAFF" } }));
    userId = user.id;
    const role = await database.accessRole.create({ data: { name: "Integration-" + actorId, permissions: ["applications.read"] } });
    roleId = role.id;
    await database.userRoleAssignment.create({ data: { userId, roleId } });
    const assigned = await database.user.findUnique({ where: { id: userId }, include: roleInclude });
    assert.deepEqual(permissionsFor(assigned), ["applications.read"]);
    assert.equal(await database.auditLog.count({ where: { actorId } }), 1);
    await assert.rejects(auditedMutation(database, { actorId, action: "test.must_fail" }, (transaction) => transaction.user.create({ data: { name: "Must roll back", email: failedEmail, passwordHash: "integration-only-no-login", role: "STAFF" } })));
    assert.equal(await database.user.count({ where: { email: failedEmail } }), 0);
  } finally {
    if (roleId) await database.accessRole.delete({ where: { id: roleId } });
    if (userId) await database.user.delete({ where: { id: userId } });
    await database.user.deleteMany({ where: { email: failedEmail } });
    await database.auditLog.deleteMany({ where: { actorId } });
    await database.$disconnect();
  }
});
