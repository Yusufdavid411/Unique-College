export const enrolmentInclude = { programme: { include: { department: true } }, session: true, level: true };
export const studentInclude = {
  user: { select: { id: true, name: true, email: true, portalUsername: true, officialEmail: true, isActive: true, mustChangePassword: true, role: true } },
  application: { select: { id: true, applicantId: true, isTest: true, status: true, fullName: true, dateOfBirth: true, gender: true, nationality: true, studentNumber: true, applicationNumber: true, courseOfInterest: true, admittedAt: true,
    offerResponse: true, acceptanceFeeAmount: true, schoolForms: true, admissionLetters: { orderBy: { version: "desc" }, take: 1 },
    documents: { where: { supersededAt: null }, select: { id: true, type: true, label: true, path: true, reviewStatus: true } },
    payments: { where: { status: "VERIFIED" }, select: { id: true, type: true, amount: true, currency: true, reference: true, status: true, isTest: true, paidAt: true } } } },
  enrolments: { include: enrolmentInclude, orderBy: [{ session: { startsAt: "desc" } }, { id: "desc" }] }
};

export async function studentRecord(database, where) {
  const record = await database.studentProfile.findUnique({ where, include: studentInclude });
  if (!record || record.user.role !== "STUDENT" || record.application.status !== "ADMITTED" || record.application.applicantId !== record.user.id) throw Object.assign(new Error("The student record is not available. Contact the admissions office."), { statusCode: 404 });
  return record;
}

export function studentProfileData(application) {
  return { userId: application.applicantId, applicationId: application.id, phoneNumber: application.phoneNumber, address: application.permanentAddress || application.address,
    guardianName: application.guardianName, guardianRelationship: application.guardianRelationship, guardianPhone: application.guardianPhone, guardianAddress: application.guardianAddress };
}
