CREATE TABLE "student_profiles" (
  id TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  "applicationId" TEXT NOT NULL UNIQUE REFERENCES applications(id) ON DELETE RESTRICT,
  "phoneNumber" TEXT, address TEXT, "guardianName" TEXT, "guardianRelationship" TEXT,
  "guardianPhone" TEXT, "guardianAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "academic_departments" (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true);
CREATE TABLE "academic_programmes" (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, "departmentId" TEXT NOT NULL REFERENCES academic_departments(id) ON DELETE RESTRICT, "isActive" BOOLEAN NOT NULL DEFAULT true);
CREATE INDEX "academic_programmes_departmentId_idx" ON academic_programmes("departmentId");
CREATE TABLE "academic_sessions" (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true, CONSTRAINT academic_session_dates CHECK ("endsAt" > "startsAt"));
CREATE TABLE "academic_levels" (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true);
CREATE TABLE "student_enrolments" (
  id TEXT PRIMARY KEY, "studentId" TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
  "programmeId" TEXT NOT NULL REFERENCES academic_programmes(id) ON DELETE RESTRICT,
  "sessionId" TEXT NOT NULL REFERENCES academic_sessions(id) ON DELETE RESTRICT,
  "levelId" TEXT NOT NULL REFERENCES academic_levels(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED','CONFIRMED')),
  "assignedBy" TEXT NOT NULL, "confirmedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("studentId", "sessionId")
);
CREATE INDEX "student_enrolments_programmeId_idx" ON student_enrolments("programmeId");
CREATE INDEX "student_enrolments_sessionId_idx" ON student_enrolments("sessionId");
CREATE INDEX "student_enrolments_levelId_idx" ON student_enrolments("levelId");
CREATE TABLE "student_announcements" (id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, "isPublished" BOOLEAN NOT NULL DEFAULT false, "publishedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "student_announcements_isPublished_publishedAt_idx" ON student_announcements("isPublished", "publishedAt");
CREATE TABLE "portal_handoffs" ("tokenHash" TEXT PRIMARY KEY, "browserHash" TEXT NOT NULL, "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, "sessionVersion" INTEGER NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3));
CREATE INDEX "portal_handoffs_expiresAt_idx" ON portal_handoffs("expiresAt");
CREATE INDEX "portal_handoffs_userId_idx" ON portal_handoffs("userId");
INSERT INTO student_profiles (id,"userId","applicationId","phoneNumber",address,"guardianName","guardianRelationship","guardianPhone","guardianAddress","updatedAt")
SELECT gen_random_uuid()::text, a."applicantId", a.id, a."phoneNumber", COALESCE(a."permanentAddress",a.address), a."guardianName", a."guardianRelationship", a."guardianPhone", a."guardianAddress", CURRENT_TIMESTAMP
FROM applications a JOIN users u ON u.id=a."applicantId" WHERE a.status='ADMITTED' AND u.role='STUDENT';
