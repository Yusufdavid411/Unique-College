import test from "node:test";
import assert from "node:assert/strict";
import { clearSession, saveSession, sessionScope, sessionToken } from "../../frontend/src/api/session.js";

function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test("admin and applicant tokens do not overwrite or sign each other out", () => {
  const store = storage();
  saveSession("admin", "admin-token", store);
  saveSession("applicant", "applicant-token", store);
  assert.equal(sessionToken(sessionScope("/admin/applications"), store), "admin-token");
  assert.equal(sessionToken(sessionScope("/applicant/payments"), store), "applicant-token");
  clearSession("applicant", store);
  assert.equal(sessionToken("applicant", store), null);
  assert.equal(sessionToken("admin", store), "admin-token");
  assert.equal(sessionToken(sessionScope("/news"), store), null);
});

test("legacy sessions migrate and cannot revive after sign-out", () => {
  const store = storage();
  store.setItem("unique_college_token", "old-token");
  assert.equal(sessionToken("admin", store), "old-token");
  saveSession("admin", "old-token", store);
  assert.equal(store.getItem("unique_college_token"), null);
  store.setItem("unique_college_token", "older-token");
  clearSession("admin", store);
  assert.equal(sessionToken("admin", store), null);
});
