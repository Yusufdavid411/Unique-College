import { ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { loginAdmin, toPublicUser } from "../services/authService.js";

export const login = asyncHandler(async (req, res) => {
  const result = await loginAdmin(req.body.email, req.body.password);
  ok(res, result, "Login successful");
});

export const me = asyncHandler(async (req, res) => {
  ok(res, { user: toPublicUser(req.user) });
});
