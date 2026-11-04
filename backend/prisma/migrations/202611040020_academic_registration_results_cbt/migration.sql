CREATE TABLE "course_registration_windows" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "minUnits" INTEGER NOT NULL,
    "maxUnits" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_registration_windows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_registrations" (
    "id" TEXT NOT NULL,
    "enrolmentId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_registrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_registration_items" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "creditUnits" INTEGER NOT NULL,

    CONSTRAINT "course_registration_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_result_batches" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reviewNote" TEXT,
    "history" JSONB NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "course_result_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_result_entries" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "registrationItemId" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "course_result_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cbt_exams" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "questions" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "resultsReleased" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cbt_exams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cbt_attempts" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "registrationItemId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "answers" JSONB NOT NULL DEFAULT '{}',
    "score" DECIMAL(5,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cbt_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "course_registration_windows_programmeId_sessionId_levelId_s_key" ON "course_registration_windows"("programmeId", "sessionId", "levelId", "semester");

CREATE UNIQUE INDEX "course_registrations_enrolmentId_semester_key" ON "course_registrations"("enrolmentId", "semester");

CREATE UNIQUE INDEX "course_registration_items_registrationId_courseId_key" ON "course_registration_items"("registrationId", "courseId");

CREATE UNIQUE INDEX "course_result_batches_courseId_key" ON "course_result_batches"("courseId");

CREATE UNIQUE INDEX "course_result_entries_batchId_registrationItemId_key" ON "course_result_entries"("batchId", "registrationItemId");

CREATE UNIQUE INDEX "cbt_attempts_examId_registrationItemId_key" ON "cbt_attempts"("examId", "registrationItemId");

ALTER TABLE "course_registrations" ADD CONSTRAINT "course_registrations_enrolmentId_fkey" FOREIGN KEY ("enrolmentId") REFERENCES "student_enrolments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "course_registration_items" ADD CONSTRAINT "course_registration_items_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "course_registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "course_registration_items" ADD CONSTRAINT "course_registration_items_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "academic_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "course_result_batches" ADD CONSTRAINT "course_result_batches_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "academic_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "course_result_entries" ADD CONSTRAINT "course_result_entries_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "course_result_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "course_result_entries" ADD CONSTRAINT "course_result_entries_registrationItemId_fkey" FOREIGN KEY ("registrationItemId") REFERENCES "course_registration_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cbt_exams" ADD CONSTRAINT "cbt_exams_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "academic_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cbt_attempts" ADD CONSTRAINT "cbt_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "cbt_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cbt_attempts" ADD CONSTRAINT "cbt_attempts_registrationItemId_fkey" FOREIGN KEY ("registrationItemId") REFERENCES "course_registration_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_registration_windows" ADD CONSTRAINT "course_registration_windows_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "academic_programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_registration_windows" ADD CONSTRAINT "course_registration_windows_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_registration_windows" ADD CONSTRAINT "course_registration_windows_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "academic_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_registration_windows" ADD CHECK ("semester" IN (1,2) AND "minUnits" >= 0 AND "maxUnits" >= "minUnits" AND "maxUnits" <= 100 AND "opensAt" < "closesAt");
ALTER TABLE "course_registrations" ADD CHECK ("semester" IN (1,2) AND "status" IN ('SUBMITTED','APPROVED','RETURNED'));
ALTER TABLE "course_result_batches" ADD CHECK ("status" IN ('DRAFT','DEPARTMENT_REVIEW','GENERAL_REVIEW','PUBLISHED'));
ALTER TABLE "course_result_entries" ADD CHECK ("score" BETWEEN 0 AND 100);
ALTER TABLE "cbt_exams" ADD CHECK ("status" IN ('DRAFT','PUBLISHED','CANCELLED') AND "durationMinutes" BETWEEN 1 AND 240 AND "startsAt" < "endsAt");
ALTER TABLE "cbt_attempts" ADD CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100);
