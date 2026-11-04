import test from "node:test";
import assert from "node:assert/strict";
import { bulkNotificationPreview, notificationAudience, sendBulkApplicationNotification } from "../src/services/applicationBulkNotifications.js";

const now = new Date("2026-11-04T12:00:00Z");
const actor = { id: "admin", name: "Admissions" };
const waiting = { id: "one", fullName: "Sample Applicant", status: "DRAFT", applicant: { email: "registered@example.com" }, statusHistory: [] };
const submitted = { ...waiting, id: "two", status: "SUBMITTED", submittedAt: now, formFeeAmount: 0 };

test("audiences separate unsent drafts, review, screening outcomes, offers and corrections", () => {
  assert.equal(notificationAudience(waiting), "waiting");
  assert.equal(notificationAudience(submitted), "submitted");
  assert.equal(notificationAudience({ ...submitted, formFeeAmount: 5000, payments: [] }), null);
  assert.equal(notificationAudience({ ...submitted, screeningStatus: "SCHEDULED" }), "screening");
  assert.equal(notificationAudience({ ...submitted, screeningStatus: "FAILED" }), "failed");
  assert.equal(notificationAudience({ ...submitted, screeningStatus: "PASSED" }), "passed");
  assert.equal(notificationAudience({ ...submitted, status: "RETURNED" }), "corrections");
  assert.equal(notificationAudience({ ...submitted, status: "REJECTED" }), "rejected");
  assert.equal(notificationAudience({ ...submitted, status: "ACCEPTED" }), "offered");
  assert.equal(notificationAudience({ ...submitted, status: "ACCEPTED", offerResponse: "DECLINED" }), null);
  assert.equal(notificationAudience({ ...submitted, status: "ADMITTED" }), null);
  assert.equal(notificationAudience({ ...submitted, isTest: true }), null);
});

test("bulk reminders use the confirmed audience and deadline without changing status", async () => {
  const recent = { ...waiting, id: "three", statusHistory: [{ id: "sent" }] };
  const saved = [];
  const transaction = {
    $queryRaw: async () => [],
    siteSetting: { findUnique: async () => ({ value: JSON.stringify({ closingDate: "2026-11-15" }) }) },
    application: { findMany: async ({ where, select }) => {
      assert.deepEqual(where.applicant, { isActive: true, role: "APPLICANT" });
      assert.equal(select.statusHistory.where.kind, "APPLICATION_REMINDER");
      return [waiting, submitted, recent].filter((record) => !where.id || where.id.in.includes(record.id));
    } },
    applicationStatusHistory: { createManyAndReturn: async ({ data }) => { saved.push(...data); return [{ id: "event" }]; } },
    auditLog: { create: async ({ data }) => assert.equal(data.action, "application.bulk_notification:waiting") }
  };
  const database = { $transaction: (run) => run(transaction) };
  const preview = await bulkNotificationPreview(transaction, "waiting", now);
  assert.deepEqual(preview.recipients, [waiting]);
  assert.equal(preview.recentlyNotified, 1);
  const input = { audience: "waiting", ids: [waiting.id], closingDate: "2026-11-15" };
  await assert.rejects(() => sendBulkApplicationNotification(database, { ...input, ids: [submitted.id] }, actor, now), /changed/);
  await assert.rejects(() => sendBulkApplicationNotification(database, { ...input, closingDate: "2026-11-16" }, actor, now), /changed/);
  assert.equal(saved.length, 0);
  await sendBulkApplicationNotification(database, input, actor, now);
  assert.equal(saved[0].emailRecipient, waiting.applicant.email);
  assert.equal(saved[0].toStatus, saved[0].fromStatus);
  assert.equal(saved[0].emailStatus, "PENDING");
  assert.match(saved[0].notificationText, /15 November 2026/);
});
