# After screening is scheduled

## Reminding applicants before submission

Set the **Application submission deadline (WAT)** under **Settings → Admissions availability**. In **Applications**, open an active applicant whose application is **Awaiting submission**, then choose **Send application reminder**. The portal notification and registered-email message include the saved deadline and a link to resume. Sending does not change application status or close admissions automatically. A reminder can be sent once per applicant every 24 hours; use the existing email retry action if delivery fails.

## Screening and admission

1. The applicant attends the scheduled examination/screening. Scheduling alone does not mean they have passed or received an admission offer.
2. Admin opens **Screening & exams → Already invited → Record screening result** on the applicant's card. Results are entered here, not under Applications.
3. With the screening payment confirmed, an authorised admissions administrator publishes **Passed** or **Not successful**, optionally adding a score and note. Before the scheduled exam time, tick **Publish before exam date** and confirm the explicit early-publication warning. This requires `screening.results.publish_early` as well as `applications.admit`; administrators have both by default. The early override, operator and scheduled date are retained in audit/history. The portal and email receive the outcome normally. Other staff can publish after the exam with their usual result permission.
4. For a successful applicant, admin reviews the supporting documents and selects **Admission offered** under Update status. Passing alone does not issue an offer. Official application and screening payments and verified required documents remain prerequisites.
5. Applicant accepts the offer, pays the quoted acceptance fee, and completes the acceptance form. Fees remain administrator-editable; current agreed fees are application NGN 5,000, screening NGN 2,000 and acceptance NGN 5,000.
6. Registrar completes clearance and releases the admission letter after verified acceptance payment and approved letter configuration. Final **Admitted** status creates student access on the same account. Letter release is a separate registrar action; it does not replace clearance.

### Rescheduling

In **Already invited**, select one or more applicants whose result has not been published. Set the replacement exam date/time and venue, then choose **Reschedule & send invitations** and confirm. The current schedule is updated and a fresh portal/email invitation is created. Prior invitation history is retained. Repeating an identical request does not create duplicate invitations. Published results and existing admission offers cannot be reset through scheduling; any retake/result-correction workflow requires a separate authorised process.

## Temporary settings requested on 4 November 2026

Only missing letter fields are populated with clearly labelled example session/duration and example dates. Messages explain scheduling, successful results, unsuccessful results and admission offers without promising admission merely for passing.

The fee-schedule approval remains unchecked. Admission letters reject session or duration containing `temporary`, even if the appendix is subsequently approved. The school must replace the example session, duration and **all** example dates with its actual policy, check each programme's duration, and review the original appendix before release. These are not approved school dates or programme durations.

Changing settings does not reschedule existing exams, alter existing fee quotes, change an applicant's status or send retrospective notifications. Existing letters retain their original snapshots.

## Current payment limitation

Flutterwave is still configured for test checkout. Regular applicants can simulate application and screening steps, but simulated payments are not accepted as official financial proof for a real admission offer, final admission or official letter release. Do not mark simulated payments as real or bypass these protections. Use the school's approved live merchant configuration for real admissions.
