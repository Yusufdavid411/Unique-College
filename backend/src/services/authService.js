import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { permissionsFor } from "./permissions.js";

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    portalUsername: user.portalUsername,
    officialEmail: user.officialEmail,
    mustChangePassword: user.mustChangePassword,
    permissions: permissionsFor(user)
  };
}

function signInResult(user) {
  const token = jwt.sign({ sub: user.id, role: user.role, version: user.sessionVersion }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });

  return { token, user: publicUser(user) };
}

export async function loginAdmin(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (user.role !== "ADMIN") {
    const error = new Error("Administrator access required");
    error.statusCode = 403;
    throw error;
  }

  return signInResult(user);
}

export async function loginApplicant(identifier, password) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalizedIdentifier },
        { portalUsername: identifier.trim() },
        { officialEmail: normalizedIdentifier }
      ]
    }
  });

  if (!user || !user.isActive || !["APPLICANT", "STUDENT"].includes(user.role)) {
    const error = new Error("Invalid applicant login details");
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error("Invalid applicant login details");
    error.statusCode = 401;
    throw error;
  }

  return signInResult(user);
}

export function toPublicUser(user) {
  return publicUser(user);
}
