import { Router } from "express";
import {
  createGalleryItem,
  deleteGalleryItem,
  listGallery,
  publicGallery,
  updateGalleryItem
} from "../controllers/galleryController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { gallerySchema, idParamSchema } from "../validators/schemas.js";

const router = Router();
const upload = imageUpload("gallery");

router.get("/public", publicGallery);
router.get("/", requireAuth, requirePermission("content.manage"), listGallery);
router.post("/", requireAuth, requirePermission("content.manage"), upload.single("image"), validate(gallerySchema), createGalleryItem);
router.put("/:id", requireAuth, requirePermission("content.manage"), validate(idParamSchema), upload.single("image"), validate(gallerySchema), updateGalleryItem);
router.delete("/:id", requireAuth, requirePermission("content.manage"), validate(idParamSchema), deleteGalleryItem);

export default router;
