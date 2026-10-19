export const permissionKeys = Object.freeze([
  "applications.read", "applications.review", "applications.admit",
  "payments.verify", "content.manage", "settings.manage", "roles.manage", "audit.read", "users.manage"
]);

export const roleInclude = { roleAssignments: { include: { role: true } } };

export function permissionsFor(user) {
  if (!user?.isActive) return [];
  if (user.role === "ADMIN") return [...permissionKeys];
  return [...new Set((user.roleAssignments || []).flatMap((assignment) => assignment.role.permissions))];
}

export function hasPermission(user, permission) {
  return permissionsFor(user).includes(permission);
}
