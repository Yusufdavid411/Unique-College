import { Router } from "express";
import {
  createContactMessage,
  listContactMessages,
  markContactRead
} from "../controllers/contactController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { contactSchema, idParamSchema } from "../validators/schemas.js";

const router = Router();

router.post("/", validate(contactSchema), createContactMessage);
router.get("/", requireAuth, requireRole("ADMIN"), listContactMessages);
router.patch("/:id/read", requireAuth, requireRole("ADMIN"), validate(idParamSchema), markContactRead);

export default router;
