import { Router } from "express";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { loginApplicant, signInResult } from "../services/authService.js";
import { roleInclude } from "../services/permissions.js";

const router = Router();
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const cookieName = env.nodeEnv === "production" ? "__Host-uc_student_handoff" : "uc_student_handoff";
const cookieOptions = { httpOnly: true, secure: env.nodeEnv === "production", sameSite: "strict", path: "/", maxAge: 90000 };
const denied = () => Object.assign(new Error("This transfer is invalid or expired. Sign in to the student portal directly."), { statusCode: 401 });
router.use(rateLimit({ windowMs: 60000, limit: 15, standardHeaders: "draft-8", legacyHeaders: false }));

router.post("/login", asyncHandler(async (req, res) => {
  const { identifier, password } = z.object({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) }).strict().parse(req.body);
  const result = await loginApplicant(identifier, password);
  const profile = result.user.role === "STUDENT" ? await prisma.studentProfile.findUnique({ where: { userId: result.user.id }, include: { application: { select: { status: true, applicantId: true } } } }) : null;
  if (!profile || profile.application.status !== "ADMITTED" || profile.application.applicantId !== result.user.id) return res.status(403).json({ success: false, message: "Student access is available after final admission. Continue in the applicant portal." });
  res.set("Cache-Control", "no-store");
  ok(res, result);
}));

router.post("/handoff", requireAuth, requireRole("STUDENT"), asyncHandler(async (req, res) => {
  if (env.nodeEnv === "production" && !["https://apply.uniquecollegekwali.com", "https://portal.uniquecollegekwali.com"].includes(req.get("origin"))) return res.status(403).json({ success: false, message: "Open the official school portal to continue." });
  const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.id }, include: { application: { select: { status: true, applicantId: true } } } });
  if (!profile || profile.application.status !== "ADMITTED" || profile.application.applicantId !== req.user.id) throw denied();
  const code = crypto.randomBytes(32).toString("hex");
  const browser = crypto.randomBytes(32).toString("hex");
  await prisma.portalHandoff.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) } } });
  await prisma.portalHandoff.create({ data: { tokenHash: hash(code), browserHash: hash(browser), userId: req.user.id, sessionVersion: req.user.sessionVersion, expiresAt: new Date(Date.now() + 60000) } });
  let target = "https://portal.uniquecollegekwali.com/continue";
  const origin = req.get("origin");
  if (env.nodeEnv !== "production" && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || "")) target = `${origin}/student/continue`;
  res.cookie(cookieName, browser, cookieOptions).set("Cache-Control", "no-store");
  ok(res, { url: `${target}#code=${code}` });
}));

router.post("/handoff/redeem", asyncHandler(async (req, res) => {
  if (env.nodeEnv === "production" && req.get("origin") !== "https://portal.uniquecollegekwali.com") return res.status(403).json({ success: false, message: "Complete sign-in on the student portal." });
  const { code } = z.object({ code: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(req.body);
  const browser = (req.get("cookie") || "").split(";").map((item) => item.trim()).find((item) => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!/^[a-f0-9]{64}$/.test(browser || "")) throw denied();
  const user = await prisma.$transaction(async (database) => {
    const handoff = await database.portalHandoff.findUnique({ where: { tokenHash: hash(code) }, include: { user: { include: roleInclude } } });
    if (!handoff || handoff.browserHash !== hash(browser) || handoff.consumedAt || handoff.expiresAt <= new Date() || !handoff.user.isActive || handoff.user.role !== "STUDENT" || handoff.sessionVersion !== handoff.user.sessionVersion) throw denied();
    const profile = await database.studentProfile.findUnique({ where: { userId: handoff.userId }, include: { application: { select: { status: true, applicantId: true } } } });
    if (!profile || profile.application.status !== "ADMITTED" || profile.application.applicantId !== handoff.userId) throw denied();
    const changed = await database.portalHandoff.updateMany({ where: { tokenHash: handoff.tokenHash, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
    if (!changed.count) throw denied();
    return handoff.user;
  }, { isolationLevel: "Serializable", timeout: 15000 });
  res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined }).set("Cache-Control", "no-store");
  ok(res, signInResult(user));
}));

export default router;
