# Applicant-to-student handover

## University research and recommended local policy

These are workflow references, not claims that their private administration screens
have been inspected or copied:

- [Oxford registration](https://www.ox.ac.uk/students/registration): offer acceptance,
  academic/financial conditions, identity/card processing and account activation
  precede registration. Student Self Service maintains the continuing student record.
- [UCL enrolment](https://www.ucl.ac.uk/study/prospective-students/undergraduate/your-offer/what-happens-next/step-9-enrolment):
  an unconditional firm offer and statutory checks precede an invitation to pre-enrol.
- [University of Ibadan 2025/26 acceptance guidance](https://ui.edu.ng/news/utme-direct-entry-acceptance-fee-payment-prospective-candidates-20252026-admission-exercise):
  an admission offer, prescribed acceptance payment and original-credential clearance
  are distinct steps before matriculation. Do not copy its fees or assume its JAMB
  requirements apply to every Unique College programme.

Recommended Unique College sequence:

1. Applicant account and server-verified application-form purchase.
2. Submitted form, supporting documents, review and corrections.
3. School issues an offer; applicant explicitly accepts or declines it.
4. Complete school-defined clearance and any approved acceptance payment, if required.
5. Admissions/Registrar authorises final admission and student account handover.
6. Student completes enrolment for the correct programme, intake, session and level.
7. Academic registration and subsequent student services use the same identity.

An application-fee payment is not acceptance of an offer or student enrolment.
Acceptance charges, deadlines and programme-specific clearance requirements require
school approval; no new charges or automatic policy decisions are introduced here.

## Current Stage 1 implementation

- Staff account creation is above the existing staff directory and pagination on
  desktop and mobile. Staff creation stays separate from admission.
- Applications is the applicant review queue. Students is a read-only admitted-student
  register, sourced from the same application and linked user, not a second database
  or a manual Create student form.
- The existing admission action already requires the admissions permission, a paid
  submitted application, declaration and verified required documents. It atomically
  changes the linked user to STUDENT, assigns a student number/portal username,
  generates a temporary password, requires first-login password change and revokes
  old sessions. Status history, receipts and the original application are retained.
- Students lists only ADMITTED applications linked to a STUDENT user. ACCEPTED
  applications are not included. Preview records are separate and excluded by default.
- GET /api/students requires students.read, returns only register fields, disables
  caching and supports bounded search and 25-row pagination. No schema change needed.
- Administrators receive students.read through the existing administrator permission
  foundation. Existing configurable staff roles need an explicit permission assignment;
  the separate staff portal and its navigation remain Stage 3 work.

## Important differences from the recommended final workflow

ACCEPTED currently means an administrator accepted the application; it does not
record the applicant accepting an offer. The current transition rules can admit a
reviewed applicant without a separately recorded offer acceptance or clearance
checklist. These rules are preserved in this release, not represented as completed
enrolment. The Students register does not imply that fees, course registration or
academic enrolment are complete.

The current officialEmail field reserves an address; it does not provision a mailbox.
Resend delivery and the full student portal are not activated by this register.
Temporary credentials are shown once to the administrator; they must be shared
securely. The next identity-delivery improvement should use expiring one-time
activation links, not email a plaintext password.

## Deferred database and portal work

- Stage 2: Student profile linked uniquely to the existing User, plus enrolments
  referencing actual programmes, sessions, intake and level records. Keep identity
  separate from enrolment so repeat years, transfers and future applications do not
  require duplicate accounts. Preserve the admission/application link and history.
- Before extending final admission policy: explicit offer and offer-response records,
  clearance requirements/checks, approval actor/timestamps and transaction-safe,
  retry-safe finalisation. Keep existing admitted students and identifiers intact.
- Stage 3: permission-scoped staff workflows for Admissions, Registrar and Finance.
- Stage 4: student activation and student-facing profile/enrolment portal at
  portal.uniquecollegekwali.com. Do not advertise that portal as complete yet.
- Stage 6: acceptance and institutional fees only after school-defined policy and
  verified payment/ledger support. Never treat an unconfigured fee as paid.

Application status notifications depend on the configured email provider. Generating
an address or credentials must never be described as successful email delivery.
