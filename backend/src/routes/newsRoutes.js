import { Router } from "express";
import {
  createNews,
  deleteNews,
  getPublicNewsBySlug,
  listNews,
  publicNews,
  updateNews
} from "../controllers/newsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idParamSchema, newsSchema } from "../validators/schemas.js";

const router = Router();

router.get("/public", publicNews);
router.get("/public/:slug", getPublicNewsBySlug);
router.get("/", requireAuth, requireRole("ADMIN"), listNews);
router.post("/", requireAuth, requireRole("ADMIN"), validate(newsSchema), createNews);
router.put("/:id", requireAuth, requireRole("ADMIN"), validate(idParamSchema), validate(newsSchema), updateNews);
router.delete("/:id", requireAuth, requireRole("ADMIN"), validate(idParamSchema), deleteNews);

export default router;
