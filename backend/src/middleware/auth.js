import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { hasPermission, roleInclude } from "../services/permissions.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: roleInclude });

    if (!user || !user.isActive || (payload.version ?? 0) !== user.sessionVersion) {
      return res.status(401).json({ success: false, message: "Invalid session" });
    }

    req.user = user;
    if (user.mustChangePassword && !(req.baseUrl === "/api/auth" && ["/me", "/password"].includes(req.path))) {
      return res.status(403).json({ success: false, code: "PASSWORD_CHANGE_REQUIRED", message: "Change your temporary password before continuing" });
    }
    next();
  } catch (error) {
    if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(error.name)) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Insufficient permission" });
    }
    next();
  };
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) return res.status(403).json({ success: false, message: "Insufficient permission" });
    next();
  };
}
