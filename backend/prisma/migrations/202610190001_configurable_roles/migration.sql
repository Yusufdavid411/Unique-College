CREATE TABLE "access_roles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  CONSTRAINT "access_roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "access_roles_name_key" ON "access_roles"("name");
CREATE TABLE "user_role_assignments" (
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("userId", "roleId"),
  CONSTRAINT "user_role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_role_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "access_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "user_role_assignments_roleId_idx" ON "user_role_assignments"("roleId");
