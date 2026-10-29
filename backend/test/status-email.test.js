import test from "node:test";
import assert from "node:assert/strict";
import { deliverStatusEmail, statusEmailContent } from "../src/services/statusEmail.js";

function fixture() {
  const event = { id: "event", emailStatus: "PENDING", emailRecipient: "applicant@example.invalid", toStatus: "RETURNED", note: "Sensitive correction note", emailAttempts: 0 };
  return { event, database: { applicationStatusHistory: {
    updateMany: async ({ data }) => { if (event.emailStatus !== "PENDING") return { count: 0 }; Object.assign(event, data); return { count: 1 }; },
    findUnique: async () => event,
    update: async ({ data }) => Object.assign(event, data)
  } } };
}
const configuration = { RESEND_API_KEY: "test-not-a-real-key", RESEND_FROM_EMAIL: "Admissions <no-reply@uniquecollegekwali.com>" };

test("status emails direct applicants to the canonical portal without exposing records", () => {
  const returned = statusEmailContent({ toStatus: "RETURNED", note: "Sensitive note" });
  assert.match(returned.text, /correct your form or documents/);
  assert.match(returned.text, /https:\/\/apply.uniquecollegekwali.com\//);
  assert.ok(!returned.text.includes("Sensitive note"));
  assert.match(statusEmailContent({ toStatus: "SUBMITTED" }).text, /under review/);
  assert.match(statusEmailContent({ toStatus: "ACCEPTED" }).text, /download your application/);
});

test("unconfigured sender retains pending notifications without pretending to send", async () => {
  const { event, database } = fixture();
  const result = await deliverStatusEmail(event.id, { database, configuration: {}, request: async () => assert.fail("No provider call without configuration") });
  assert.equal(result.status, "NOT_CONFIGURED");
  assert.equal(event.emailStatus, "PENDING");
});

test("provider submissions are idempotent and recorded sent notifications are never resent", async () => {
  const { event, database } = fixture();
  let sends = 0;
  const request = async (url, options) => {
    sends++;
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(options.headers["Idempotency-Key"], "admissions-status/event");
    assert.deepEqual(JSON.parse(options.body).to, [event.emailRecipient]);
    return new Response(JSON.stringify({ id: "provider-id" }), { status: 200 });
  };
  const results = await Promise.all([deliverStatusEmail(event.id, { database, request, configuration }), deliverStatusEmail(event.id, { database, request, configuration })]);
  assert.equal(sends, 1);
  assert.equal(results.filter((result) => result.status === "SENT").length, 1);
  assert.equal(event.emailStatus, "SENT");
  assert.equal((await deliverStatusEmail(event.id, { database, request, configuration })).status, "UNCHANGED");
});

test("provider failures remain retryable and store only a sanitized error code", async () => {
  const { event, database } = fixture();
  const result = await deliverStatusEmail(event.id, { database, configuration, request: async () => new Response("private provider detail", { status: 403 }) });
  assert.equal(result.status, "FAILED");
  assert.equal(event.emailStatus, "FAILED");
  assert.equal(event.emailError, "PROVIDER_403");
  assert.equal(event.emailSentAt, undefined);
});
