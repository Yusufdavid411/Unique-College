CREATE TABLE "staff_student_assignments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "staffId" TEXT NOT NULL,
  "enrolmentId" TEXT NOT NULL,
  "assignedBy" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "staff_student_assignments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "staff_student_assignments_enrolmentId_fkey" FOREIGN KEY ("enrolmentId") REFERENCES "student_enrolments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "staff_student_assignments_staffId_enrolmentId_key" ON "staff_student_assignments"("staffId", "enrolmentId");
CREATE INDEX "staff_student_assignments_staffId_isActive_idx" ON "staff_student_assignments"("staffId", "isActive");
