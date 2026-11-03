export const staffEnrolmentSelection = {
  id: true, status: true,
  programme: { select: { name: true, department: { select: { name: true } } } },
  session: { select: { name: true, isActive: true } }, level: { select: { name: true } },
  student: { select: { user: { select: { name: true, email: true } }, application: { select: { studentNumber: true } } } }
};

export function assignedStudentScope(staffId) {
  return { staffId, isActive: true, enrolment: { session: { isActive: true }, student: { user: { isActive: true, role: "STUDENT" }, application: { status: "ADMITTED" } } } };
}
