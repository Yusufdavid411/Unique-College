import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";

test("staff creation precedes the directory and its pagination", async () => {
  const source = await readFile(new URL("../../frontend/src/pages/admin/AdminUsers.jsx", import.meta.url), "utf8");
  assert.ok(source.indexOf("<h2>Create staff account</h2>") < source.indexOf('id="staff-directory-title"'));
  assert.ok(source.indexOf('id="staff-directory-title"') < source.indexOf('aria-label="Staff account pages"'));
  assert.doesNotMatch(source, /admin-two-col/);
});

test("student register is permission-protected, read-only, paginated and isolated from preview records", async () => {
  const original = { user: prisma.user.findUnique, list: prisma.application.findMany, count: prisma.application.count, transaction: prisma.$transaction };
  const calls = [];
  const users = {
    admin: { role: "ADMIN" }, applicant: { role: "APPLICANT" }, student: { role: "STUDENT" },
    admissions: { role: "STAFF", roleAssignments: [{ role: { permissions: ["applications.review"] } }] },
    registrar: { role: "STAFF", roleAssignments: [{ role: { permissions: ["students.read"] } }] }
  };
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/students`;
  const headers = (id) => ({ Authorization: `Bearer ${jwt.sign({ sub: id, version: 0 }, env.jwtSecret)}` });
  try {
    prisma.user.findUnique = async ({ where }) => ({ id: where.id, isActive: true, sessionVersion: 0, ...users[where.id] });
    prisma.application.findMany = async (options) => {
      calls.push(options);
      return [{ id: "admitted-application", fullName: "Admitted student", studentNumber: "UCHK/2026/EXAMPLE", applicant: { portalUsername: "UCEXAMPLE", isActive: true } }];
    };
    prisma.application.count = async ({ where }) => { assert.deepEqual(where, calls.at(-1).where); return 26; };
    prisma.$transaction = async (queries) => Promise.all(queries);
    assert.equal((await fetch(base)).status, 401);
    for (const id of ["applicant", "student", "admissions"]) assert.equal((await fetch(base, { headers: headers(id) })).status, 403);
    assert.equal(calls.length, 0);
    const response = await fetch(base + "?page=2&search=Admitted", { headers: headers("admin") });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const result = (await response.json()).data;
    assert.equal(result.page, 2);
    assert.equal(result.total, 26);
    const query = calls.at(-1);
    assert.equal(query.where.status, "ADMITTED");
    assert.equal(query.where.isTest, false);
    assert.deepEqual(query.where.applicant, { is: { role: "STUDENT" } });
    assert.equal(query.skip, 25);
    assert.equal(query.take, 25);
    assert.ok(query.where.OR.every((entry) => Object.values(entry)[0].contains === "Admitted"));
    assert.deepEqual(Object.keys(query.select).sort(), ["id", "fullName", "email", "applicationNumber", "studentNumber", "courseOfInterest", "admittedAt", "applicant"].sort());
    assert.deepEqual(query.select.applicant.select, { portalUsername: true, isActive: true });
    assert.equal((await fetch(base + "?testing=true", { headers: headers("registrar") })).status, 200);
    assert.equal(calls.at(-1).where.isTest, true);
    for (const queryString of ["?page=0", "?page=10001", "?testing=invalid", `?search=${"x".repeat(101)}`]) assert.equal((await fetch(base + queryString, { headers: headers("admin") })).status, 422);
    assert.equal((await fetch(base, { method: "POST", headers: headers("admin") })).status, 404);
  } finally {
    prisma.user.findUnique = original.user;
    prisma.application.findMany = original.list;
    prisma.application.count = original.count;
    prisma.$transaction = original.transaction;
    await new Promise((resolve) => server.close(resolve));
  }
});
