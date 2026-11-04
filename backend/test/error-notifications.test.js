import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { apiErrorMessage, describeApiError } from "../../frontend/src/api/errorMessages.js";
import { dismissNotification, getNotifications, notify, reportApiError, reportUnexpectedError } from "../../frontend/src/api/notifications.js";

function clear() { for (const notification of getNotifications()) dismissNotification(notification.id); }

test("expired stored sessions return to login without masquerading as a failed sign-in", async () => {
  const source = await readFile(new URL("../../frontend/src/context/AuthContext.jsx", import.meta.url), "utf8");
  assert.match(source, /api\.get\("\/auth\/me", \{ headers:.*notifyOnError: false/);
  assert.match(source, /if \(\[401, 403\]\.includes\(error.response\?\.status\)\) clearSession\(scope\);\s+else reportApiError\(error\);/);
  const security = await readFile(new URL("../../frontend/src/components/ChangePassword.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(security, /Activate staff access/);
  assert.doesNotMatch(security, /Activate student access/);
});

test("network errors distinguish offline, timeout and unreachable service without inventing a cause", () => {
  assert.match(describeApiError({ code: "ERR_NETWORK" }, false).message, /no internet connection/);
  assert.match(describeApiError({ code: "ERR_NETWORK" }, true).message, /couldn't connect/);
  assert.equal(describeApiError({ code: "ECONNABORTED" }, true).title, "Connection timed out");
  assert.match(describeApiError({ code: "ECONNABORTED", config: { url: "/payments/flutterwave/checkout" } }).message, /Do not pay again/);
});

test("HTTP errors provide useful login, validation, permission and service messages", () => {
  assert.equal(describeApiError({ response: { status: 401 }, config: { url: "/auth/login" } }).title, "Unable to sign in");
  for (const url of ["/auth/applicant/login", "/auth/student/login", "/auth/staff/login", "https://api.uniquecollegekwali.com/api/auth/staff/login"]) {
    assert.equal(describeApiError({ response: { status: 401 }, config: { url } }).title, "Unable to sign in");
    assert.doesNotMatch(describeApiError({ response: { status: 401 }, config: { url } }).message, /session has expired/);
  }
  assert.equal(describeApiError({ response: { status: 401 }, config: { url: "/auth/me" } }).title, "Please sign in again");
  assert.equal(describeApiError({ response: { status: 401 }, config: { url: "/auth/staff/login-history" } }).title, "Please sign in again");
  assert.equal(describeApiError({ response: { status: 401 } }).title, "Please sign in again");
  assert.match(describeApiError({ response: { status: 403, data: { message: "Admission approval permission required" } } }).message, /permission required/);
  assert.match(describeApiError({ response: { status: 422, data: { data: { missing: ["First name", "Date of birth"] } } } }).message, /First name, Date of birth/);
  assert.match(describeApiError({ response: { status: 429 } }).message, /Too many requests/);
  assert.ok(!apiErrorMessage({ response: { status: 500, data: { message: "private database connection details" } } }).includes("private database"));
});

test("API and caller errors share one notification and cancelled requests stay silent", () => {
  clear();
  const error = { isAxiosError: true, response: { status: 413 } };
  reportApiError(error);
  reportApiError(error);
  notify({ message: apiErrorMessage(error) });
  assert.equal(getNotifications().length, 1);
  reportApiError({ code: "ERR_CANCELED" });
  reportUnexpectedError({ name: "AbortError" });
  assert.equal(getNotifications().length, 1);
  clear();
});

test("unexpected errors are safe, dismissible and do not disclose raw exceptions", () => {
  clear();
  reportUnexpectedError(new Error("sensitive runtime state"));
  assert.equal(getNotifications().length, 1);
  assert.ok(!getNotifications()[0].message.includes("sensitive"));
  clear();
  for (let index = 0; index < 5; index++) notify({ message: `Bounded notification ${index}` });
  assert.equal(getNotifications().length, 3);
  clear();
});
