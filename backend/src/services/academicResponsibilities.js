export const responsibilities = ["HOD", "DEPARTMENT_EXAM_OFFICER", "GENERAL_EXAM_OFFICER"];

export async function departmentCourseAccess(database, user, departmentId) {
  if (user.role === "ADMIN") return true;
  if (user.role !== "STAFF") return false;
  return Boolean(await database.academicAppointment.findFirst({
    where: { staffId: user.id, departmentId, responsibility: "HOD", isActive: true, staff: { isActive: true }, department: { isActive: true } }
  }));
}
