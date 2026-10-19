import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission, permissionsFor } from "../src/services/permissions.js";

test("active legacy administrators retain permissions", () => {
  assert.equal(hasPermission({ role: "ADMIN", isActive: true }, "roles.manage"), true);
});

test("inactive administrators and applicants have no implicit permissions", () => {
  assert.deepEqual(permissionsFor({ role: "ADMIN", isActive: false }), []);
  assert.equal(hasPermission({ role: "APPLICANT", isActive: true }, "applications.read"), false);
});

test("staff combine assigned permissions without gaining admission or role management", () => {
  const user = { role: "STAFF", isActive: true, roleAssignments: [
    { role: { permissions: ["applications.read", "applications.review"] } },
    { role: { permissions: ["applications.read", "payments.verify"] } }
  ] };
  assert.equal(permissionsFor(user).length, 3);
  assert.equal(hasPermission(user, "payments.verify"), true);
  assert.equal(hasPermission(user, "applications.admit"), false);
  assert.equal(hasPermission(user, "roles.manage"), false);
});
