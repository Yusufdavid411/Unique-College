CREATE TABLE "academic_appointments" (
  "id" TEXT PRIMARY KEY, "staffId" TEXT NOT NULL, "departmentId" TEXT,
  "responsibility" TEXT NOT NULL CHECK ("responsibility" IN ('HOD','DEPARTMENT_EXAM_OFFICER','GENERAL_EXAM_OFFICER')),
  "assignedBy" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "endedAt" TIMESTAMP(3),
  FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("departmentId") REFERENCES "academic_departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK (("responsibility"='GENERAL_EXAM_OFFICER' AND "departmentId" IS NULL) OR ("responsibility"<>'GENERAL_EXAM_OFFICER' AND "departmentId" IS NOT NULL))
);
CREATE INDEX "academic_appointments_staffId_isActive_idx" ON "academic_appointments"("staffId","isActive");
CREATE UNIQUE INDEX "one_active_department_responsibility" ON "academic_appointments"("departmentId","responsibility") WHERE "isActive"=true AND "departmentId" IS NOT NULL;
CREATE UNIQUE INDEX "one_active_general_exam_officer" ON "academic_appointments"("responsibility") WHERE "isActive"=true AND "responsibility"='GENERAL_EXAM_OFFICER';
CREATE TABLE "academic_courses" (
  "id" TEXT PRIMARY KEY, "departmentId" TEXT NOT NULL, "programmeId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL, "levelId" TEXT NOT NULL,
  "semester" INTEGER NOT NULL CHECK ("semester" IN (1,2)),
  "code" TEXT NOT NULL, "title" TEXT NOT NULL,
  "creditUnits" INTEGER NOT NULL CHECK ("creditUnits" BETWEEN 1 AND 30),
  "category" TEXT NOT NULL CHECK ("category" IN ('CORE','ELECTIVE')),
  "published" BOOLEAN NOT NULL DEFAULT false, "createdBy" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("departmentId") REFERENCES "academic_departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("programmeId") REFERENCES "academic_programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("sessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("levelId") REFERENCES "academic_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "academic_courses_programmeId_sessionId_levelId_semester_code_key" ON "academic_courses"("programmeId","sessionId","levelId","semester","code");
CREATE INDEX "academic_courses_departmentId_sessionId_idx" ON "academic_courses"("departmentId","sessionId");
