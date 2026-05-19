import { prisma } from "../config/prisma.js";
import { ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listSettings = asyncHandler(async (req, res) => {
  const settings = await prisma.siteSetting.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] });
  ok(res, settings);
});

export const upsertSetting = asyncHandler(async (req, res) => {
  const setting = await prisma.siteSetting.upsert({
    where: { key: req.body.key },
    update: { value: req.body.value, group: req.body.group || "general" },
    create: { key: req.body.key, value: req.body.value, group: req.body.group || "general" }
  });
  ok(res, setting, "Setting saved");
});
