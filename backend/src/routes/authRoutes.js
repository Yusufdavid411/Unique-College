import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginStaff } from "../services/authService.js";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { requirePermission } from "../middleware/auth.js";
import { requestPasswordReset, completePasswordReset, resetPasswordSchema, resetRequestSchema } from "../services/passwordReset.js";
import studentAuthRoutes from "./studentAuthRoutes.js";
import { applicantLogin, login, me, changePassword } from "../controllers/authController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { applicantLoginSchema, loginSchema } from "../validators/schemas.js";

const router = Router();
router.post("/staff/login", rateLimit({ windowMs: 15 * 60000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: { success: false, message: "Too many sign-in attempts. Try again later." } }), asyncHandler(async (req, res) => {
  const body = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) }).strict().parse(req.body);
  res.set("Cache-Control", "no-store");
  ok(res, await loginStaff(body.email, body.password));
}));
const resetLimiter = rateLimit({ windowMs: 15 * 60000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: { success: false, message: "Too many reset attempts. Please try again in 15 minutes." } });
router.use(["/forgot-password", "/reset-password", "/send-password-reset"], (req, res, next) => { res.set("Cache-Control", "no-store"); next(); }, resetLimiter);
router.post("/forgot-password", validate(z.object({ body: resetRequestSchema })), asyncHandler(async (req, res) => {
  await requestPasswordReset(req.body.email);
  ok(res, null, "If an active account matches this email, a reset link will be sent. Check your inbox and spam folder.");
}));
router.post("/reset-password", validate(z.object({ body: z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: resetPasswordSchema }) })), asyncHandler(async (req, res) => {
  await completePasswordReset(req.body.token, req.body.password);
  ok(res, null, "Password reset. Sign in with your new password.");
}));
router.post("/send-password-reset", requireAuth, requirePermission("users.manage"), validate(z.object({ body: resetRequestSchema })), asyncHandler(async (req, res) => {
  await requestPasswordReset(req.body.email, { actorId: req.user.id });
  ok(res, null, "If an active account matches this email, a reset link will be sent. The user chooses their own password.");
}));
router.use("/student", studentAuthRoutes);

router.post("/login", validate(loginSchema), login);
router.post("/applicant/login", validate(applicantLoginSchema), applicantLogin);
router.get("/me", requireAuth, me);
router.post("/password", requireAuth, changePassword);

export default router;
