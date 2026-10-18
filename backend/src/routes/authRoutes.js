import { Router } from "express";
import { applicantLogin, login, me } from "../controllers/authController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { applicantLoginSchema, loginSchema } from "../validators/schemas.js";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.post("/applicant/login", validate(applicantLoginSchema), applicantLogin);
router.get("/me", requireAuth, me);

export default router;
