import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { uploadRoot } from "../config/uploads.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { permissionsFor } from "../services/permissions.js";
import { canReadApplicantFile, resolveUploadPath } from "../services/fileAccess.js";
import { sendStoredFile } from "../services/storage.js";

export const publicFile = asyncHandler(async (req, res, next) => {
  const storedPath = "/uploads" + req.path;
  const target = resolveUploadPath(uploadRoot, storedPath);
  if (!target) return res.sendStatus(404);
  const [news, gallery] = await Promise.all([
    prisma.news.findFirst({ where: { imagePath: storedPath, isPublished: true }, select: { id: true } }),
    prisma.gallery.findFirst({ where: { imagePath: storedPath, isPublished: true }, select: { id: true } })
  ]);
  if (!news && !gallery) return res.sendStatus(404);
  res.set("X-Content-Type-Options", "nosniff");
  await sendStoredFile(storedPath, res);
});

const router = Router();
router.get("/", requireAuth, asyncHandler(async (req, res, next) => {
  const storedPath = req.query.path;
  const target = resolveUploadPath(uploadRoot, storedPath);
  if (!target) return res.sendStatus(404);
  const permissions = permissionsFor(req.user);
  let permitted = false;
  if (permissions.includes("content.manage")) {
    const [news, gallery] = await Promise.all([
      prisma.news.findFirst({ where: { imagePath: storedPath }, select: { id: true } }),
      prisma.gallery.findFirst({ where: { imagePath: storedPath }, select: { id: true } })
    ]);
    permitted = Boolean(news || gallery);
  }
  if (!permitted) {
    const application = await prisma.application.findFirst({
      where: { OR: [{ passportPath: storedPath }, { documents: { some: { path: storedPath } } }, { payments: { some: { proofPath: storedPath } } }] },
      select: { applicantId: true }
    });
    permitted = application && canReadApplicantFile(req.user, application.applicantId, permissions);
  }
  if (!permitted && permissions.includes("payments.verify")) {
    permitted = Boolean(await prisma.payment.findFirst({ where: { proofPath: storedPath }, select: { id: true } }));
  }
  if (!permitted) return res.sendStatus(404);
  res.set({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
  await sendStoredFile(storedPath, res, true);
}));
export default router;
