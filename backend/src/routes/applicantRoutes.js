import { Router } from "express";
import {
  deleteApplicantDocument,
  getApplicantDashboard,
  recordApplicantPayment,
  registerApplicant,
  submitApplicantApplication,
  updateApplicantApplication,
  uploadApplicantDocument
} from "../controllers/applicantController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { documentUpload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import {
  applicantApplicationSchema,
  applicantDocumentSchema,
  applicantPaymentSchema,
  applicantRegisterSchema
} from "../validators/schemas.js";

const router = Router();
const upload = documentUpload("documents");

router.post("/register", validate(applicantRegisterSchema), registerApplicant);
router.use(requireAuth, requireRole("APPLICANT", "STUDENT"));
router.get("/dashboard", getApplicantDashboard);
router.patch("/application", validate(applicantApplicationSchema), updateApplicantApplication);
router.post("/application/submit", submitApplicantApplication);
router.post("/documents", upload.single("file"), validate(applicantDocumentSchema), uploadApplicantDocument);
router.delete("/documents/:documentId", deleteApplicantDocument);
router.post("/payments", upload.single("proof"), validate(applicantPaymentSchema), recordApplicantPayment);

export default router;
