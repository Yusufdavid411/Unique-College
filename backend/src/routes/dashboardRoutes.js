import { Router } from "express";
import { dashboardStats } from "../controllers/dashboardController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/stats", requireAuth, requireRole("ADMIN"), dashboardStats);

export default router;
