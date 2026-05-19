import { Router } from "express";
import { login, me } from "../controllers/authController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loginSchema } from "../validators/schemas.js";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.get("/me", requireAuth, requireRole("ADMIN"), me);

export default router;
