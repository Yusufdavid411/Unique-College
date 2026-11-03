ALTER TABLE "applications" DROP CONSTRAINT "screening_status_check";
ALTER TABLE "applications" ADD CONSTRAINT "screening_status_check"
  CHECK ("screeningStatus" IN ('NOT_SCHEDULED','APPROVED','SCHEDULED','PASSED','FAILED','EXEMPT'));
