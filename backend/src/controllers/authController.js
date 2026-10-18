import { ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { loginAdmin, loginApplicant, toPublicUser } from "../services/authService.js";

export const login = asyncHandler(async (req, res) => {
  const result = await loginAdmin(req.body.email, req.body.password);
  ok(res, result, "Login successful");
});

export const applicantLogin = asyncHandler(async (req, res) => {
  const result = await loginApplicant(req.body.identifier, req.body.password);
  ok(res, result, "Login successful");
});

export const me = asyncHandler(async (req, res) => {
  ok(res, { user: toPublicUser(req.user) });
});
