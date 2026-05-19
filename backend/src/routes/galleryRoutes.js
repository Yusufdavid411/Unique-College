import { Router } from "express";
import {
  createGalleryItem,
  deleteGalleryItem,
  listGallery,
  publicGallery,
  updateGalleryItem
} from "../controllers/galleryController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { gallerySchema, idParamSchema } from "../validators/schemas.js";

const router = Router();
const upload = imageUpload("gallery");

router.get("/public", publicGallery);
router.get("/", requireAuth, requireRole("ADMIN"), listGallery);
router.post("/", requireAuth, requireRole("ADMIN"), upload.single("image"), validate(gallerySchema), createGalleryItem);
router.put("/:id", requireAuth, requireRole("ADMIN"), upload.single("image"), validate(idParamSchema), validate(gallerySchema), updateGalleryItem);
router.delete("/:id", requireAuth, requireRole("ADMIN"), validate(idParamSchema), deleteGalleryItem);

export default router;
