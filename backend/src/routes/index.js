import { Router } from "express";
import applicationRoutes from "./applicationRoutes.js";
import authRoutes from "./authRoutes.js";
import contactRoutes from "./contactRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import galleryRoutes from "./galleryRoutes.js";
import newsRoutes from "./newsRoutes.js";
import settingsRoutes from "./settingsRoutes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ success: true, message: "Unique College API is healthy" });
});

router.use("/auth", authRoutes);
router.use("/applications", applicationRoutes);
router.use("/contacts", contactRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/gallery", galleryRoutes);
router.use("/news", newsRoutes);
router.use("/settings", settingsRoutes);

export default router;
