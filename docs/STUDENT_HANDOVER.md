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
The school approved an initial NGN 5,000 acceptance fee. Administrators can edit
the amount under Settings; a quote is captured when an offer is issued. Changes
apply to new offers only. Zero explicitly waives the fee for new offers. No offer
deadline or additional programme-specific clearance requirement has been invented.

## Current Stage 1 implementation

- Staff account creation is above the existing staff directory and pagination on
  desktop and mobile. Staff creation stays separate from admission.
- Applications is the applicant review queue. Students is a read-only admitted-student
  register, sourced from the same application and linked user, not a second database
  or a manual Create student form.
- The existing admission action already requires the admissions permission, a paid
  submitted application, declaration and verified required documents. It atomically
  changes the linked user to STUDENT, assigns a student number/portal username,
  preserves their existing password and applicant session. The applicant dashboard
  links to student sign-in with the same email and password. No duplicate account or
  plaintext student password is created. History, receipts and the application remain.
- Students lists only ADMITTED applications linked to a STUDENT user. ACCEPTED
  applications are not included. Preview records are separate and excluded by default.
- GET /api/students requires students.read, returns only register fields, disables
  caching and supports bounded search and 25-row pagination. No schema change needed.
- Administrators receive students.read through the existing administrator permission
  foundation. Existing configurable staff roles need an explicit permission assignment;
  the separate staff portal and its navigation remain Stage 3 work.

## Acceptance and clearance implemented

ACCEPTED means the school has issued an offer; the separate offerResponse records
the applicant's acceptance or decline, with its own timestamp. Responses are
idempotent and cannot be changed after confirmation without admissions intervention.
Issuing/reissuing an offer captures the configured price only if a quote has not
already been recorded. Existing quoted prices are preserved on reissue.

Only an accepted active offer can start ACCEPTANCE_FEE checkout. The same
Flutterwave service verifies amount, currency, reference and transaction status.
An application-form payment cannot satisfy the acceptance fee. Preview and real
payments remain isolated. Repeated checkout/verification cannot duplicate the fee.
Applicants and administrators download acceptance receipts separately from forms.

An authorised admissions officer records PENDING, CORRECTIONS_REQUIRED or CLEARED
clearance, with a note and actor/timestamp. Clearing requires an accepted offer,
verified quoted acceptance payment and verified required admission documents.
Applicants can upload document corrections when specifically requested in clearance.
Rejecting a required document invalidates previous clearance. Final admission
rechecks the requirements inside a serializable transaction; the earlier direct
review-to-admitted shortcut is blocked. Offers with pending/verified acceptance
payments cannot be casually withdrawn or deleted. Final student records are retained.

Students retain access to their admissions records and may change their password
from account security when they choose. Academic enrolment/course registration
is not implied by admission.

The current officialEmail field reserves an address; it does not provision a mailbox.
Resend delivery and the full student portal are not activated by this register.
Email notifications never contain a password. Final admission enables student
sign-in without a new account or a password-reset link. Forgotten-password recovery still requires the separate
email/recovery feature; it is not provided by knowing a student's email address.

## Deferred database and portal work

- Implemented foundation: StudentProfile linked uniquely to the existing User and
  Application, with academic assignments referencing real programmes, sessions and
  levels. Intake, transfer, repeat-year and academic progression rules remain later
  work. See STUDENT_PORTAL.md for the current scope.
- Richer intake/offer records, deadlines and configurable programme-specific clearance
  checklists can extend the current response/clearance foundation later. Preserve
  existing admitted students, identifiers and quoted fees.
- Stage 3: permission-scoped staff workflows for Admissions, Registrar and Finance.
- Student portal foundation: portal.uniquecollegekwali.com now supports sign-in,
  profile, academic details, records and announcements. It is not the full later-stage
  academic/finance platform.
- Stage 6: general institutional fees, invoicing and broader finance workflows.
  The approved acceptance-fee handover is implemented now; an absent quote is not paid.

Application status notifications depend on the configured email provider. Generating
an address or credentials must never be described as successful email delivery.

## Migration and activation boundaries

Migration 202611020011_acceptance_handover is additive. Existing admitted students
are grandfathered with a zero acceptance quote and cleared state; no retrospective
charge is imposed. Existing active offers receive the approved initial quote.
The release preflight refuses automatic migration if prior acceptance payments
exist and require financial reconciliation. Application/payment records are retained.

Flutterwave currently remains restricted test mode on the official portal. The new
flow is available to designated test accounts through the same server verification
logic; live payments still require verified school merchant credentials. Resend
delivery must be configured before promising automated notification delivery.
