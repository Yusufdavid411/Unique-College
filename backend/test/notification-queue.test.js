import test from "node:test";
import assert from "node:assert/strict";
import { processNotificationQueue } from "../src/services/notificationQueue.js";
import { retryableStatusEmails } from "../src/services/statusEmail.js";

test("retry eligibility excludes recently attempted and old uncertain deliveries", () => {
  const now = new Date("2026-11-03T10:00:00Z");
  const where = retryableStatusEmails(now);
  assert.equal(where.OR[0].emailStatus, "PENDING");
  assert.equal(where.OR[1].emailLastAttemptAt.lt.toISOString(), "2026-11-03T09:59:00.000Z");
  assert.equal(where.OR[2].emailLastAttemptAt.lt.toISOString(), "2026-11-03T09:58:00.000Z");
  assert.equal(where.OR[2].createdAt.gt.toISOString(), "2026-11-02T11:00:00.000Z");
});

test("unconfigured retry jobs do not query or consume notifications", async () => {
  const result = await processNotificationQueue({ configuration: {}, database: {} });
  assert.equal(result.configured, false);
  assert.equal(result.attempted, 0);
});

test("bounded retry batches are paced, idempotent and return only counts", async () => {
  const events = new Map(["one", "two"].map((id) => [id, { id, emailStatus: "PENDING", emailRecipient: `${id}@fixture.invalid`, toStatus: "SUBMITTED" }]));
  const waits = [];
  let sends = 0;
  const database = { applicationStatusHistory: {
    findMany: async ({ where, take }) => { assert.equal(take, 2); assert.ok(where.OR); return [...events.values()].map(({ id }) => ({ id })); },
    updateMany: async ({ where, data }) => { const event = events.get(where.id); if (event.emailStatus !== "PENDING") return { count: 0 }; Object.assign(event, data); return { count: 1 }; },
    findUnique: async ({ where }) => events.get(where.id),
    update: async ({ where, data }) => Object.assign(events.get(where.id), data)
  } };
  const configuration = { RESEND_API_KEY: "private-fixture", RESEND_FROM_EMAIL: "no-reply@uniquecollegekwali.com" };
  const request = async () => { sends++; return new Response(JSON.stringify({ id: "provider-fixture" }), { status: 200 }); };
  const options = { database, configuration, limit: 2, request, wait: async (delay) => waits.push(delay) };
  assert.deepEqual(await processNotificationQueue(options), { configured: true, attempted: 2, sent: 2, failed: 0, unchanged: 0 });
  assert.equal(sends, 2);
  assert.deepEqual(waits, [550]);
  assert.equal((await processNotificationQueue(options)).sent, 0);
  assert.equal(sends, 2);
  await assert.rejects(() => processNotificationQueue({ limit: 51 }));
});
