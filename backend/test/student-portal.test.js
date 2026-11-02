import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { studentPortalHref, portalScope, portalPath, canonicalPortalHref } from "../../frontend/src/api/portalLinks.js";
import { scopeForUser, sessionScope, saveSession, clearSession, sessionToken } from "../../frontend/src/api/session.js";
import { studentProfileData } from "../src/services/studentRecords.js";

test("student domains and session storage stay distinct from applicant and administrator access", () => {
  const host = "portal.uniquecollegekwali.com";
  assert.equal(portalScope(host), "student");
  assert.equal(sessionScope("/profile", host), "student");
  assert.equal(portalPath("/student", host), "/");
  assert.equal(portalPath("/student/login", host), "/");
  assert.equal(portalPath("/student/academic", host), "/academic");
  assert.equal(portalPath("/student/academic", "localhost"), "/student/academic");
  assert.equal(canonicalPortalHref("/student/records", "www.uniquecollegekwali.com"), "https://portal.uniquecollegekwali.com/records");
  assert.equal(studentPortalHref("www.uniquecollegekwali.com"), "https://portal.uniquecollegekwali.com/");
  assert.equal(studentPortalHref("localhost"), "/student");
  assert.equal(portalScope("portal.uniquecollegekwali.com.attacker.test"), null);
  assert.equal(scopeForUser({ role: "STUDENT" }), "student");
  const map = new Map();
  const storage = { getItem: (key) => map.get(key) || null, setItem: (key, value) => map.set(key, value), removeItem: (key) => map.delete(key) };
  for (const scope of ["admin", "applicant", "student"]) saveSession(scope, `${scope}-token`, storage);
  clearSession("student", storage);
  assert.equal(sessionToken("student", storage), null);
  assert.equal(sessionToken("admin", storage), "admin-token");
  assert.equal(sessionToken("applicant", storage), "applicant-token");
});

test("student profile copies contact values without creating a duplicate identity or changing admissions", () => {
  const record = { id: "application", applicantId: "user", email: "private@example.invalid", phoneNumber: "08000000000", address: "Admission address", permanentAddress: "Permanent address", guardianName: "Guardian" };
  const data = studentProfileData(record);
  assert.equal(data.userId, "user");
  assert.equal(data.applicationId, "application");
  assert.equal(data.address, "Permanent address");
  assert.equal(data.guardianName, "Guardian");
  assert.equal(data.email, undefined);
});

test("student UI uses one-time transfers and progressive disclosure without fake academic figures", async () => {
  const root = new URL("../../frontend/src/", import.meta.url);
  const transfer = await readFile(new URL("components/StudentTransfer.jsx", root), "utf8");
  assert.match(transfer, /withCredentials: true/);
  assert.match(transfer, /window\.history\.replaceState/);
  assert.doesNotMatch(transfer, /\?token=|#token=|\.token\}/);
  const pages = await readFile(new URL("pages/student/StudentPages.jsx", root), "utf8");
  assert.match(pages, /Awaiting academic assignment/);
  assert.match(pages, /compact \? result.items.slice\(0, 3\)/);
  assert.match(pages, /version: entry.updatedAt/);
  assert.doesNotMatch(pages, /CGPA:|GPA:|4\.00|50000/);
  const shell = await readFile(new URL("components/PortalShell.jsx", root), "utf8");
  assert.match(shell, /event.key === "Escape"/);
  assert.match(shell, /inert=/);
  assert.match(shell, /Skip to content/);
});
