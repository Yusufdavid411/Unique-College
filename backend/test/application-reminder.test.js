import test from "node:test";
import assert from "node:assert/strict";
import { createApplicationReminder } from "../src/services/applicationReminder.js";
import { applicationClosingDateSchema, parseAdmissionsPolicy } from "../src/services/admissionsPolicy.js";
import { statusEmailContent } from "../src/services/statusEmail.js";

const now = new Date("2026-11-03T23:30:00Z");
const actor = { id: "admin", name: "Admissions officer" };

function fixture({ closingDate = "2026-11-04", ...overrides } = {}) {
  const events = [];
  const audits = [];
  const application = { id: "application", fullName: "Sample Applicant", status: "DRAFT", submittedAt: null, email: "old@example.invalid", applicant: { email: "registered@example.invalid", role: "APPLICANT", isActive: true }, ...overrides };
  const transaction = {
    $queryRaw: async () => [],
    application: { findUnique: async () => application },
    siteSetting: { findUnique: async () => ({ value: JSON.stringify({ closingDate }) }) },
    applicationStatusHistory: {
      findFirst: async ({ where }) => events.find((event) => event.kind === where.kind && event.createdAt >= where.createdAt.gte),
      create: async ({ data }) => { const event = { ...data, id: "event", createdAt: now }; events.push(event); return event; }
    },
    auditLog: { create: async ({ data }) => audits.push(data) }
  };
  return { database: { $transaction: async (work) => work(transaction) }, events, audits };
}

test("reminder uses the saved WAT deadline and registered email, without changing application status", async () => {
  const { database, events, audits } = fixture();
  const event = await createApplicationReminder(database, "application", actor, now);
  assert.equal(event.kind, "APPLICATION_REMINDER");
  assert.equal(event.fromStatus, event.toStatus);
  assert.equal(event.emailRecipient, "registered@example.invalid");
  assert.equal(event.emailStatus, "PENDING");
  assert.match(event.notificationText, /Wednesday, 4 November 2026, at 11:59 pm \(WAT\)/);
  assert.match(event.notificationText, /https:\/\/apply\.uniquecollegekwali\.com\//);
  assert.ok(statusEmailContent(event).text.includes(event.notificationText));
  assert.equal(audits[0].actorId, actor.id);
  await assert.rejects(createApplicationReminder(database, "application", actor, now), { statusCode: 429 });
  assert.equal(events.length, 1);
});

test("reminders reject missing or expired dates and ineligible accounts", async () => {
  for (const overrides of [{ closingDate: "" }, { closingDate: "2026-11-03" }, { closingDate: "2026-02-30" }, { status: "SUBMITTED" }, { submittedAt: now }, { status: "RETURNED" }, { applicant: null }]) {
    const { database, events, audits } = fixture(overrides);
    await assert.rejects(createApplicationReminder(database, "application", actor, now));
    assert.equal(events.length, 0);
    assert.equal(audits.length, 0);
  }
  assert.equal(applicationClosingDateSchema.safeParse("2026-02-30").success, false);
  assert.equal(parseAdmissionsPolicy(JSON.stringify({ open: true, applicationFee: 5000 })).closingDate, "");
});
