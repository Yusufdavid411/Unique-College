# Screening and school-document workflow

## Agreed fees and order

1. Register an applicant account and pay the quoted application fee (new default NGN 5,000).
2. Complete the application, upload credentials and submit for review.
3. Admissions reviews the submitted application and chooses Accept for screening, Reject, or Corrections required. Accept for screening notifies the applicant and unlocks screening payment; it does not issue an admission offer.
4. The applicant pays the screening fee through Flutterwave (default NGN 2,000; the quote is saved when checkout starts). After verification, admissions schedules the exam and sends the personalized date, time (Africa/Lagos), venue and instructions.
5. With confirmed screening payment, authorised admissions staff publish each candidate's actual result after the examination time, or an administrator explicitly authorises an audited early publication. Scheduling a group does not pass, offer admission to or enrol the group.
6. A successful screening result, verified credentials and the existing application checks allow an individual admission offer. Acceptance remains NGN 5,000 by default, editable in Settings.
7. The applicant accepts the offer and pays the quoted acceptance fee. Confirmation automatically issues the admission letter when approved session/duration/dates/appendix settings are complete. Incomplete or stale settings never reverse a successful payment: issuance waits for registry correction and payment-status refresh or an explicit release retry. The applicant completes the acceptance form online and obtains required handwritten signatures on the downloaded copy.
8. Registry clears the applicant and performs final admission. The existing account becomes a student account; no duplicate identity, backend or database is created. Student record and guarantor forms are available in Student portal → Documents & receipts.

All three fee settings are editable. Changing a policy does not silently change existing quotes or verified payments. The application-fee migration changes only the global price, not historical applicant balances. Existing accepted/admitted applicants are grandfathered as screening-exempt and are not retroactively blocked by the new acceptance-form requirement.

## Administrative screens

- Admin → Screening & exams: select eligible applicants, review recipients, schedule/reschedule, and inspect email delivery results.
- Admin → Screening & exams → Already invited → Record screening result: publish an individual result. Administrators can explicitly choose **Publish before exam date** and confirm an audited early override; payment and submission checks still apply. Select scheduled candidates here to reschedule them; published outcomes cannot be reset by scheduling.
- Admin → Applications → Admission letter release: optional duration override and explicit release after payment.
- Admin → Settings → School settings → Screening, messages & admission letters: screening fee, session, default duration, effective date, registration window, O-level deadline, lectures date and notification wording.
- Application download panels in both admin and applicant/student portals use the same authenticated backend PDF endpoints. Receipts remain separate files.

## Original five-page school pack

The supplied pack contains a provisional admission letter, fee appendix, acceptance form, guarantor form and student record form. Generic templates are held in `backend/assets/school-*.pdf`; no named applicant's source file is committed. `backend/scripts/prepare-school-documents.py` regenerates them from an authorised local original using PyMuPDF.

The letter template permanently redacts sample reference, name and historical variable text. It retains the school logo, letterhead, static clauses and supplied registrar signature. Only the appropriate variable regions are populated. Other forms retain their original school page design, lines and headings. Signature lines remain blank: the application never fabricates student, guarantor or witness signatures.

The original fee appendix contains additional charges and bank instructions. Its inclusion requires explicit registrar approval in Settings; it does not create invoices or silently activate these other charges. Review it before approval. Session/duration/dates start blank; missing or stale release details block issuance rather than reuse the historical example. Issued letters retain a versioned immutable snapshot. Template overflow produces a validation error instead of clipping or shrinking text illegibly. School-form submission preflights its PDF so applicants can shorten entries before the form becomes immutable.

The earlier two-page application form remains on its existing school template, with its logo. Its header was visually compared with the source after filling. Application PDF, admission letter, individual school forms and individual receipts are separate downloads.

## Notifications and operational dependencies

Scheduling, results, offers and letter release save portal notifications transactionally with the underlying record. Editable screening/offer messages are snapshotted into history. The applicant dashboard exposes these updates without relying on email delivery.

When `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL` are configured, selected screening invitations are automatically attempted in bounded concurrent groups; other changes attempt their own notification after commit. Failed/unconfigured notifications remain in PostgreSQL. API responses report queued versus submitted-to-provider counts honestly. `SENT` means the provider accepted the request, not proof of inbox delivery.

Admin → Screening → Email delivery queue processes a retry batch. `npm run notifications:retry --prefix backend` is the portable worker command for scheduled retries; a VPS scheduler or external scheduler can run it. A secured daily Vercel fallback now processes up to 20 eligible records; its `CRON_SECRET` must be configured. Retry claims, provider idempotency keys and uncertainty windows remain enforced by the existing status-email service. Configure email before relying on email notifications. See [Activation checklist](ACTIVATION_CHECKLIST.md) for setup, limits and live verification steps.

Flutterwave test/live isolation remains enforced. Configuring these fees does not activate live collection or move real applicants into test checkout. Live collection still requires the school's approved merchant credentials. No real payment is made by the automated tests.

## Access, concurrency and portability

- Screening scheduling requires `applications.review`; result publication and letter release require `applications.admit`; policy editing requires `settings.manage`.
- Applicants can modify only their own permitted forms. Document endpoints authorise ownership or `applications.read` and return private/no-store attachments.
- Submitted school forms are immutable; stale draft versions are rejected. Registry-mediated form corrections and issued-letter replacement/version administration are future explicit workflows, not silent overwrites.
- Scheduling preserves a candidate's original quote and repeated identical scheduling/letter release is idempotent. Test and real candidates cannot share a schedule batch.
- PostgreSQL remains authoritative for schedules, fees, snapshots and audit history. PDF generation uses local generic templates and standard Node libraries; it requires neither Google Drive nor a provider-specific database. Existing storage abstraction and portable backups remain in place.
- Migration `202611020013_screening_school_documents` is additive, retains existing applicants/payments and adds school forms, letter versions and screening state. Do not roll it back by deleting operational records.

## Research informing the order

- [University of Ibadan admissions](https://admissions.ui.edu.ng/): screening payment, candidate-specific examination information and email/portal communication.
- [Lagos University Teaching Hospital schools](https://schools.luth.gov.ng/): applicant account, payment and online application, followed by entrance-exam requirements for shortlisted applicants.

These are workflow references, not authority to copy another institution's fees, admission rules or branding. Unique College's approved process and supplied templates govern this implementation.

## Verification

`npm test --prefix backend` covers policies, exact fees/modes, form access/validation and generated PDF structure. With an isolated `INTEGRATION_DATABASE_URL`, the admissions integration test exercises scheduling, automatic screening verification with a stubbed provider, exam results, acceptance verification, letter release, form submission, separate admin/applicant downloads and final student conversion against PostgreSQL. Fictional PDF fixtures are rendered under ignored `tmp/pdfs/` for visual review; they must never be issued as real admission documents.
