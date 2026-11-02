import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { hasPermission } from "../services/permissions.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { documentsPolicy } from "../services/admissionDocuments.js";
import { admissionProgressFor } from "../services/acceptance.js";
import { admissionLetterPdf, schoolFormPdf } from "../services/schoolDocumentsPdf.js";
import { attemptStatusEmail } from "../services/statusEmail.js";
import { releaseAdmissionLetter } from "../services/admissionLetters.js";
const router = Router();
router.use(requireAuth);
router.post("/:id/issue-letter", requirePermission("applications.admit"), asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { duration } = z.object({ duration: z.string().trim().min(2).max(80).optional() }).strict().parse(req.body);
  const result = await releaseAdmissionLetter(prisma, id, req.user, duration);
  await attemptStatusEmail(result.eventId);
  ok(res, result.letter, "Admission letter released. The issued details are retained unchanged.");
}));
router.get("/:id/documents/:kind", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const kind = z.enum(["LETTER", "ACCEPTANCE", "GUARANTOR", "STUDENT_RECORD"]).parse(req.params.kind);
  const application = await prisma.application.findUnique({ where: { id }, include: { payments: true, schoolForms: true, studentProfile: { include: { enrolments: { include: { programme: { include: { department: true } } }, orderBy: { createdAt: "desc" }, take: 1 } } }, admissionLetters: { orderBy: { version: "desc" }, take: 1 } } });
  const owner = application?.applicantId === req.user.id;
  if (!application || (!owner && !hasPermission(req.user, "applications.read"))) return res.sendStatus(404);
  const letter = application.admissionLetters[0];
  let bytes;
  if (kind === "LETTER") {
    if (!letter || !["ACCEPTED", "ADMITTED"].includes(application.status) || !admissionProgressFor(application).paid) return res.status(409).json({ message: "The admission letter is available after acceptance payment and the registrar's release." });
    bytes = await admissionLetterPdf(application, letter);
  } else {
    const form = application.schoolForms.find((record) => record.kind === kind && record.status === "SUBMITTED");
    if (!form) return res.status(409).json({ message: "Submit this form before downloading its completed school copy." });
    if (kind === "ACCEPTANCE" && !admissionProgressFor(application).paid) return res.status(409).json({ message: "Acceptance payment is not confirmed." });
    if (kind !== "ACCEPTANCE" && application.status !== "ADMITTED") return res.status(409).json({ message: "This student record is available after final admission." });
    const details = { ...(letter?.snapshot || { ...(await documentsPolicy(prisma)), programme: application.courseOfInterest }), department: application.studentProfile?.enrolments[0]?.programme.department.name };
    if (kind === "GUARANTOR" && !details.department) return res.status(409).json({ message: "The registry must assign your official department and programme before the guarantor form can be printed." });
    if (!details.session) return res.status(409).json({ message: "The registry must configure the academic session before this school document can be printed." });
    bytes = await schoolFormPdf(application, form, details, application.studentProfile);
  }
  res.set({ "Content-Type": "application/pdf", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
  res.attachment(`${kind.toLowerCase().replaceAll("_", "-")}.pdf`).send(Buffer.from(bytes));
}));
export default router;
