import crypto from "node:crypto";
import { isIP } from "node:net";
import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";

export const publicWebsiteOrigins = ["https://uniquecollegekwali.com", "https://www.uniquecollegekwali.com"];
const publicPaths = new Set(["/", "/about", "/courses", "/admission", "/gallery", "/news", "/events", "/contact", "/privacy", "/leadership/executive", "/leadership/board", "/leadership/management", "/leadership/hods"]);
const dayMilliseconds = 86400000;

export function analyticsWindow(days = 30, now = new Date()) {
  const today = new Date(new Date(now.getTime() + 3600000).toISOString().slice(0, 10) + "T00:00:00Z");
  return { today, start: new Date(today.getTime() - (days - 1) * dayMilliseconds), retentionStart: new Date(today.getTime() - 89 * dayMilliseconds) };
}

export function normalizeAnalyticsPath(value) {
  if (typeof value !== "string" || value.includes("?") || value.includes("#")) return null;
  const path = value === "/" ? "/" : value.replace(/\/$/, "");
  return publicPaths.has(path) ? path : null;
}

export function analyticsDevice(userAgent = "") {
  if (/ipad|tablet|android(?!.*mobile)/i.test(userAgent)) return "Tablet";
  return /mobile|iphone|ipod/i.test(userAgent) ? "Mobile" : "Desktop";
}

export function analyticsReferrer(value) {
  try {
    const referrer = new URL(value);
    if (!["https:", "http:"].includes(referrer.protocol)) return "Direct / internal";
    const hostname = referrer.hostname.toLowerCase().replace(/^www\./, "");
    if (isIP(hostname) || hostname === "localhost" || hostname.endsWith(".local")) return "Direct / internal";
    if (hostname === "uniquecollegekwali.com" || hostname.endsWith(".uniquecollegekwali.com")) return "Direct / internal";
    return /^[a-z0-9.-]{1,253}$/.test(hostname) ? hostname : "Direct / internal";
  } catch { return "Direct / internal"; }
}

export function ignoredAnalyticsRequest(req) {
  return req.get("DNT") === "1" || req.get("Sec-GPC") === "1" || /bot|crawler|spider|headless|preview|slurp|facebookexternalhit|whatsapp|curl|wget|python/i.test(req.get("user-agent") || "");
}

export function analyticsVisitorHash(ip, device, day, secret = process.env.ANALYTICS_HASH_SECRET || env.jwtSecret) {
  const dailyKey = crypto.createHmac("sha256", secret).update(`website-analytics:${day.toISOString().slice(0, 10)}`).digest();
  return crypto.createHmac("sha256", dailyKey).update(`${ip || "unknown"}:${device}`).digest("hex");
}

export async function recordWebsitePageView(database, event, now = new Date()) {
  const { today, retentionStart } = analyticsWindow(30, now);
  const data = { id: event.id, day: today, path: event.path, device: event.device, referrer: event.referrer, visitorHash: analyticsVisitorHash(event.ip, event.device, today) };
  return database.$transaction(async (transaction) => {
    await transaction.websitePageView.deleteMany({ where: { day: { lt: retentionStart } } });
    const count = await transaction.websitePageView.count({ where: { day: today, visitorHash: data.visitorHash } });
    if (count >= 300) return;
    await transaction.websitePageView.createMany({ data: [data], skipDuplicates: true });
  });
}

export async function websiteAnalyticsSummary(database, days, now = new Date()) {
  const { start, today } = analyticsWindow(days, now);
  const scope = Prisma.sql`FROM website_page_views WHERE day >= ${start} AND day <= ${today}`;
  const [totals, daily, pages, sources, devices] = await Promise.all([
    database.$queryRaw(Prisma.sql`SELECT count(*)::int AS "pageViews", count(DISTINCT "visitorHash")::int AS "visitorDays" ${scope}`),
    database.$queryRaw(Prisma.sql`SELECT to_char(day, 'YYYY-MM-DD') AS date, count(*)::int AS "pageViews", count(DISTINCT "visitorHash")::int AS "visitorDays" ${scope} GROUP BY day ORDER BY day`),
    database.$queryRaw(Prisma.sql`SELECT path AS label, count(*)::int AS views ${scope} GROUP BY path ORDER BY views DESC, path LIMIT 10`),
    database.$queryRaw(Prisma.sql`SELECT referrer AS label, count(*)::int AS views ${scope} GROUP BY referrer ORDER BY views DESC, referrer LIMIT 10`),
    database.$queryRaw(Prisma.sql`SELECT device AS label, count(*)::int AS views ${scope} GROUP BY device ORDER BY views DESC, device`)
  ]);
  const dailyMap = new Map(daily.map((entry) => [entry.date, entry]));
  const series = Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() + index * dayMilliseconds).toISOString().slice(0, 10);
    return dailyMap.get(date) || { date, pageViews: 0, visitorDays: 0 };
  });
  return { days, timezone: "Africa/Lagos", totals: totals[0] || { pageViews: 0, visitorDays: 0 }, daily: series, pages, sources, devices, generatedAt: now.toISOString() };
}
