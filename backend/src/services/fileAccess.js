import path from "node:path";

export function resolveUploadPath(root, storedPath) {
  if (typeof storedPath !== "string" || !/^\/uploads\/(applications|documents|gallery|profiles)\/[a-zA-Z0-9_-]+\.(pdf|jpe?g|png|webp)$/.test(storedPath)) return null;
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, storedPath.slice("/uploads/".length));
  return target.startsWith(resolvedRoot + path.sep) ? target : null;
}

export function canReadApplicantFile(user, applicantId, permissions = []) {
  return Boolean(user?.isActive && (user.id === applicantId || permissions.includes("applications.read")));
}
