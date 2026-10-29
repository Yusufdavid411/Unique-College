import { Router } from "express";
import { prisma } from "../config/prisma.js";
import applicationRoutes from "./applicationRoutes.js";
import applicantRoutes from "./applicantRoutes.js";
import authRoutes from "./authRoutes.js";
import contactRoutes from "./contactRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import galleryRoutes from "./galleryRoutes.js";
import newsRoutes from "./newsRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import roleRoutes from "./roleRoutes.js";
import auditRoutes from "./auditRoutes.js";
import fileRoutes from "./fileRoutes.js";
import eventRoutes from "./eventRoutes.js";
import userRoutes from "./userRoutes.js";
import recordRoutes from "./recordRoutes.js";
import paymentGatewayRoutes from "./paymentGatewayRoutes.js";
import analyticsRoutes from "./analyticsRoutes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ success: true, message: "Unique College API is healthy" });
});

router.get("/health/db", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: "Unique College database is healthy" });
  } catch (error) {
    next(error);
  }
});

router.use("/auth", authRoutes);
router.use("/applications", applicationRoutes);
router.use("/applicant", applicantRoutes);
router.use("/contacts", contactRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/gallery", galleryRoutes);
router.use("/news", newsRoutes);
router.use("/settings", settingsRoutes);
router.use("/roles", roleRoutes);
router.use("/audit", auditRoutes);
router.use("/files", fileRoutes);
router.use("/events", eventRoutes);
router.use("/users", userRoutes);
router.use("/records", recordRoutes);
router.use("/payments/flutterwave", paymentGatewayRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
