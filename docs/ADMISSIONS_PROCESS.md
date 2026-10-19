# Admissions process and implementation order

The backend foundation is the current priority. Complete PostgreSQL connectivity,
migrations, permission assignments, private storage, and operational verification
before activating paid admissions in production.

## Applicant journey

1. Read programme requirements and current admissions availability.
2. Create a basic applicant account to identify the buyer and recover interrupted payments.
3. Purchase the application form using the school's approved fee and payment account.
4. Confirm payment on the server, then unlock the application form and supporting uploads.
5. Submit, track review, respond to corrections, and receive the admissions decision.
6. Pay any approved acceptance fee after an offer, then complete enrolment and student access.

Account creation is distinct from purchasing or submitting a form. Payment must be
linked to one applicant and admissions intake, with a stable reference. Check the
amount, currency, merchant account, payment status, and applicant before unlocking
the form. Payment callbacks must be verified server-side and processed idempotently.
Keep evidence-based manual verification available only through authorised finance staff.

## Availability controls implemented now

Administrators can open or close new applications and publish a closure message
under Site settings. Applicant registration enforces the policy; the legacy public
application endpoint is retired with HTTP 410. Existing applicants keep access to
their accounts, drafts, submissions, and tracking. Closing new applications does
not revoke purchased forms; a separate submission deadline will be designed with
intake records. Unconfigured admissions default to closed. Database failure does
not bypass the policy.

## Still pending

Hosted checkout, intake-specific pricing and submission deadlines await approved
school policy and merchant configuration. The current portal supports a quoted
form-purchase gate with manual finance verification;
do not advertise it as live online checkout. Do not invent fee amounts or create a
merchant account on the school's behalf.

## Research

- University of Ibadan admission payments: https://admissions.ui.edu.ng/admissions.ui.edu.ng
- Paystack server-side verification: https://paystack.com/docs/payments/verify-payments/
- Paystack signed webhooks: https://paystack.com/docs/payments/webhooks/

Paystack is a researched example, not a committed provider choice.

## Implementation checkpoint — 19 October 2026

Paid forms now use a fee quoted at registration and unlock only after an exact
application-fee payment is verified by an authorised reviewer. Account creation
precedes payment so applicants can track evidence; the detailed form and document
upload remain locked until verification. School instructions and the approved fee
must be configured before opening admissions. This is manual payment review, not
live hosted checkout. Applicants and administrators can print application records.

## Receipt submission safeguards

An applicant can have only one receipt awaiting review, across all payment types.
The API checks before accepting the upload and again in a serializable transaction
to protect against concurrent requests. The portal disables submission while a
receipt is pending. Applicants may remove pending or rejected evidence and upload
a replacement; rejection also permits resubmission without removal. Removal marks
the payment CANCELLED, retaining its file and an audit event for staff. Verified
receipts cannot be removed by applicants, and verified form fees cannot be paid
again. Only authorised staff can verify payment and unlock the form.

Migration 202610190006_receipt_withdrawal adds the cancellation status and replaces
global reference uniqueness with a partial unique index for PENDING/VERIFIED
references. Rejected or withdrawn evidence can be corrected using the same genuine
bank reference. Preserve this SQL index when migrating databases; Prisma db push
is not a substitute for the migration history.

File transfers use a four-minute client timeout and show progress when available;
ordinary API requests retain the shorter timeout. After an uncertain receipt
submission the portal refreshes payment history rather than automatically posting
again. Admin and applicant sessions now use separate browser-storage keys, so
signing into one portal does not silently replace the other's credentials.
