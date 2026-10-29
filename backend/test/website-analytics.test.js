import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import { analyticsDevice, analyticsReferrer, analyticsVisitorHash, analyticsWindow, normalizeAnalyticsPath, recordWebsitePageView, websiteAnalyticsSummary } from "../src/services/websiteAnalytics.js";
import { publicReferrer, sendWebsitePageView, shouldTrackWebsiteVisit } from "../../frontend/src/api/websiteAnalytics.js";

test("analytics accepts public routes only and strips referral details", () => {
  assert.equal(normalizeAnalyticsPath("/news/"), "/news");
  for (const path of ["/admin", "/applicant/application", "/payments", "/?email=private", "/news#private", "https://other.example", "/unknown"]) assert.equal(normalizeAnalyticsPath(path), null);
  assert.equal(analyticsReferrer("https://www.google.com/search?q=private#secret"), "google.com");
  assert.equal(analyticsReferrer("https://admin.uniquecollegekwali.com/applications"), "Direct / internal");
  assert.equal(analyticsReferrer("javascript:private"), "Direct / internal");
  assert.equal(analyticsReferrer("https://192.0.2.1/private"), "Direct / internal");
  assert.equal(analyticsDevice("Mozilla iPhone Mobile"), "Mobile");
  assert.equal(analyticsDevice("Mozilla Android Tablet"), "Tablet");
  assert.equal(analyticsDevice("Mozilla Windows"), "Desktop");
});

test("daily visitor estimates rotate at Lagos midnight and do not retain addresses", () => {
  const before = analyticsWindow(7, new Date("2026-10-28T22:59:59Z"));
  const after = analyticsWindow(7, new Date("2026-10-28T23:00:00Z"));
  assert.equal(before.today.toISOString().slice(0, 10), "2026-10-28");
  assert.equal(after.today.toISOString().slice(0, 10), "2026-10-29");
  assert.equal(after.start.toISOString().slice(0, 10), "2026-10-23");
  const first = analyticsVisitorHash("192.0.2.1", "Mobile", before.today, "unit-test-secret");
  assert.equal(first, analyticsVisitorHash("192.0.2.1", "Mobile", before.today, "unit-test-secret"));
  assert.notEqual(first, analyticsVisitorHash("192.0.2.1", "Mobile", after.today, "unit-test-secret"));
  assert.match(first, /^[a-f0-9]{64}$/);
});

test("recording is UUID-idempotent, bounded and removes data outside retention", async () => {
  const records = new Map();
  let cap = 0;
  const transaction = { websitePageView: {
    deleteMany: async ({ where }) => assert.equal(where.day.lt.toISOString().slice(0, 10), "2026-08-01"),
    count: async () => cap,
    createMany: async ({ data, skipDuplicates }) => {
      assert.equal(skipDuplicates, true);
      for (const entry of data) {
        assert.equal(Object.hasOwn(entry, "ip"), false);
        assert.equal(Object.hasOwn(entry, "userAgent"), false);
        if (!records.has(entry.id)) records.set(entry.id, entry);
      }
    }
  } };
  const database = { $transaction: async (callback) => callback(transaction) };
  const event = { id: crypto.randomUUID(), path: "/", ip: "192.0.2.1", device: "Desktop", referrer: "Direct / internal" };
  const now = new Date("2026-10-29T10:00:00Z");
  await recordWebsitePageView(database, event, now);
  await recordWebsitePageView(database, event, now);
  assert.equal(records.size, 1);
  cap = 300;
  await recordWebsitePageView(database, { ...event, id: crypto.randomUUID() }, now);
  assert.equal(records.size, 1);
});

test("analytics reports fill missing days without labelling visitor-days as unique people", async () => {
  const results = [[{ pageViews: 3, visitorDays: 2 }], [{ date: "2026-10-29", pageViews: 3, visitorDays: 2 }], [{ label: "/", views: 3 }], [{ label: "Direct / internal", views: 3 }], [{ label: "Desktop", views: 3 }]];
  let calls = 0;
  const database = { $queryRaw: async (query) => { assert.ok(query.values.some((value) => value instanceof Date)); return results[calls++]; } };
  const summary = await websiteAnalyticsSummary(database, 7, new Date("2026-10-29T12:00:00Z"));
  assert.equal(summary.daily.length, 7);
  assert.equal(summary.daily[0].pageViews, 0);
  assert.equal(summary.daily.at(-1).pageViews, 3);
  assert.equal(summary.totals.visitorDays, 2);
  assert.equal(summary.timezone, "Africa/Lagos");
});

test("browser tracker respects privacy signals, omits credentials and ignores private portal hosts", async () => {
  for (const hostname of ["admin.uniquecollegekwali.com", "apply.uniquecollegekwali.com", "portal.uniquecollegekwali.com", "localhost"]) assert.equal(shouldTrackWebsiteVisit({ hostname }, {}), false);
  assert.equal(shouldTrackWebsiteVisit({ hostname: "www.uniquecollegekwali.com" }, { doNotTrack: "1" }), false);
  assert.equal(shouldTrackWebsiteVisit({ hostname: "www.uniquecollegekwali.com" }, { globalPrivacyControl: true }), false);
  assert.equal(publicReferrer("https://search.example/path?private=secret"), "https://search.example");
  let sent;
  sendWebsitePageView({ apiBase: "https://api.uniquecollegekwali.com", path: "/news", browser: { location: { hostname: "www.uniquecollegekwali.com" }, crypto: { randomUUID: () => "11111111-1111-4111-8111-111111111111" } }, navigator: {}, document: { referrer: "https://search.example/path?secret=private" }, request: async (url, options) => { sent = { url, options }; } });
  assert.equal(sent.options.credentials, "omit");
  assert.equal(sent.options.referrerPolicy, "no-referrer");
  assert.equal(JSON.parse(sent.options.body).referrer, "https://search.example");
  assert.ok(!sent.options.body.includes("secret"));
});

test("collection rejects portal paths and privacy opt-outs; reports require analytics permission", async () => {
  const original = { user: prisma.user.findUnique, transaction: prisma.$transaction, query: prisma.$queryRaw };
  let writes = 0;
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/analytics`;
  const id = crypto.randomUUID();
  async function collect(body, extra = {}) { return fetch(base + "/pageviews", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://www.uniquecollegekwali.com", "User-Agent": "Mozilla/5.0", ...extra }, body: JSON.stringify(body) }); }
  try {
    prisma.$transaction = async () => { writes++; };
    assert.equal((await collect({ id, path: "/admin" })).status, 422);
    assert.equal((await collect({ id, path: "/", email: "private@example.invalid" })).status, 422);
    assert.equal((await collect({ id, path: "/" }, { Origin: "https://admin.uniquecollegekwali.com" })).status, 403);
    assert.equal((await collect({ id, path: "/" }, { DNT: "1" })).status, 204);
    assert.equal((await collect({ id, path: "/" }, { "Sec-GPC": "1" })).status, 204);
    assert.equal((await collect({ id, path: "/" }, { "User-Agent": "Googlebot" })).status, 204);
    assert.equal(writes, 0);
    assert.equal((await collect({ id, path: "/news" })).status, 204);
    assert.equal(writes, 1);
    assert.equal((await fetch(base + "/summary")).status, 401);
    prisma.user.findUnique = async ({ where }) => ({ id: where.id, role: where.id === "admin" ? "ADMIN" : "APPLICANT", isActive: true, sessionVersion: 0 });
    const applicant = jwt.sign({ sub: "applicant", version: 0 }, env.jwtSecret);
    assert.equal((await fetch(base + "/summary", { headers: { Authorization: `Bearer ${applicant}` } })).status, 403);
    const admin = jwt.sign({ sub: "admin", version: 0 }, env.jwtSecret);
    prisma.$queryRaw = async (query) => query.strings.join("").includes("count(DISTINCT") && !query.strings.join("").includes("GROUP BY") ? [{ pageViews: 0, visitorDays: 0 }] : [];
    const response = await fetch(base + "/summary?days=7", { headers: { Authorization: `Bearer ${admin}` } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal((await response.json()).data.daily.length, 7);
    assert.equal((await fetch(base + "/summary?days=100000", { headers: { Authorization: `Bearer ${admin}` } })).status, 422);
  } finally {
    prisma.user.findUnique = original.user;
    prisma.$transaction = original.transaction;
    prisma.$queryRaw = original.query;
    await new Promise((resolve) => server.close(resolve));
  }
});
