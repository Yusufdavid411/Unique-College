import test from "node:test";
import assert from "node:assert/strict";
import { assignedStudentScope, staffEnrolmentSelection } from "../src/services/staffRecords.js";
import { permissionsFor, hasPermission } from "../src/services/permissions.js";
import { portalScope, portalPath, canonicalPortalHref } from "../../frontend/src/api/portalLinks.js";
import { scopeForUser, sessionScope } from "../../frontend/src/api/session.js";

test("staff records always bind the requesting staff identity and active membership", () => {
  const scope = assignedStudentScope("staff-one");
  assert.equal(scope.staffId, "staff-one");
  assert.equal(scope.isActive, true);
  assert.equal(scope.enrolment.session.isActive, true);
  assert.equal(scope.enrolment.student.application.status, "ADMITTED");
  assert.equal(scope.enrolment.student.user.role, "STUDENT");
  assert.equal(staffEnrolmentSelection.student.select.application.select.documents, undefined);
  assert.equal(staffEnrolmentSelection.student.select.user.select.passwordHash, undefined);
});
test("adviser permission alone does not grant all-student, admin or assignment-management access", () => {
  const user = { role: "STAFF", isActive: true, roleAssignments: [{ role: { permissions: ["advisees.read"] } }] };
  assert.deepEqual(permissionsFor(user), ["advisees.read"]);
  assert.equal(hasPermission(user, "students.read"), false);
  assert.equal(hasPermission(user, "staff.assignments.manage"), false);
  assert.equal(hasPermission({ ...user, isActive: false }, "advisees.read"), false);
});
test("staff URLs and tokens are separated from administration and public website", () => {
  assert.equal(portalScope("staff.uniquecollegekwali.com"), "staff");
  assert.equal(portalPath("/staff/login", "staff.uniquecollegekwali.com"), "/");
  assert.equal(portalPath("/staff/students", "staff.uniquecollegekwali.com"), "/students");
  assert.equal(canonicalPortalHref("/staff/profile", "www.uniquecollegekwali.com"), "https://staff.uniquecollegekwali.com/profile");
  assert.equal(scopeForUser({ role: "STAFF" }), "staff");
  assert.equal(sessionScope("/staff/profile", "localhost"), "staff");
});
