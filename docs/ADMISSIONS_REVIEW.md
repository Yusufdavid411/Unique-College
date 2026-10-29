# Admissions review and notifications

## Status-first workflow

Applicants pay the stored form quote, complete their details and required uploads,
then submit. A verified payment alone is not an application submission. The default
admin queue contains paid, submitted applications. A separate waiting queue shows
account status only, not unfinished form contents. Returned forms must be resubmitted
before another review. Submitted application details and supporting documents are
collapsed by default. Payment receipts remain independent of application acceptance.

The admin status action appears first. Submitted records are labelled New submission;
applicants see Under review and instructions to check back. Returning a form requires
a correction note. Acceptance requires verified documents, declaration, and form payment.
Only ACCEPTED and ADMITTED applications with a submission date and confirmed form
payment can download the original application PDF, for both applicants and admins.
An accepted form is not the same as final admission or student-account provisioning.

Admin Settings now contains School settings and Account security. Old admin/security
links redirect to the security section in Settings. Applicant account security stays separate.

## Automatic payments

Application review contains no payment approval selector. Flutterwave remains responsible
for gateway verification; the API never allows manual overrides of Flutterwave transactions.
Do not enable live payments without the school's approved merchant configuration. Previously
recorded MANUAL receipts are not converted to gateway payments or silently verified. If those
need resolution, the existing permission-protected finance API remains available to operators.

## Status emails through Resend

Configure RESEND_API_KEY and RESEND_FROM_EMAIL in the API environment. The sender must
belong to a domain verified in Resend. A domain name or a website login alone does not
configure email delivery. Mailbox hosting is separate. No credentials belong in GitHub.

Status changes and submissions atomically persist a PENDING email on their status-history
row. Sending is awaited after commit with an eight-second provider timeout. Provider failures
do not undo a saved decision or submission. Same-status note edits do not send duplicate mail.
No passwords, full forms, or review notes are included in email: applicants follow the fixed
https://apply.uniquecollegekwali.com/ address to read sensitive information securely.

SENT means accepted by Resend, not confirmed delivered to the recipient's inbox. The admin
history panel reports configuration/pending status and can retry unsent notifications through
POST /api/applications/:id/notifications/retry with applications.review permission. Claims
prevent concurrent sends; Resend idempotency keys protect retries for its 24-hour retention
period. Uncertain deliveries older than 23 hours are held for investigation rather than
automatically resent outside that window: investigate provider logs.
The operation never resends a recorded SENT notification.

For scheduled retries on a VPS or approved external scheduler, run
`npm run notifications:retry --prefix backend`. No scheduler or paid service is provisioned
automatically. Until a verified sender is configured, notifications remain queued and the
applicant portal is the authoritative place to check status. No actual mail delivery is claimed.

## Release and portability

Apply Prisma migrations before deploying the API, including the previously additive
Flutterwave payment columns and the status-history email fields. PostgreSQL is the durable
notification queue; no serverless memory or local files are required. Existing records default
to NOT_REQUIRED, so rollout does not email historical decisions. Configure the same environment
on a VPS and run the same Express application and retry command.

Research references: Oxford's [decision timeline](https://www.ox.ac.uk/admissions/graduate/after-you-apply/decision-timeline)
and [UCAS tracking](https://www.ucas.com/applying/after-you-apply/tracking-your-ucas-application)
use status tracking after submission, with decisions also communicated by email. This project's
acceptance-only application-form download rule is the school's own requirement, not a claim
that these other institutions implement that identical restriction.
