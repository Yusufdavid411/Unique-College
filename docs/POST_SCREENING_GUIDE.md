# After screening is scheduled

## Reminding applicants before submission

Set the **Application submission deadline (WAT)** under **Settings → Admissions availability**. In **Applications**, open an active applicant whose application is **Awaiting submission**, then choose **Send application reminder**. The portal notification and registered-email message include the saved deadline and a link to resume. Sending does not change application status or close admissions automatically. A reminder can be sent once per applicant every 24 hours; use the existing email retry action if delivery fails.

## Screening and admission

1. The applicant attends the scheduled examination/screening. Scheduling alone does not mean they have passed or received an admission offer.
2. Admin opens **Screening & exams → Already invited → Record screening result** on the applicant's card. Results are entered here, not under Applications.
3. With the screening payment confirmed, an authorised admissions administrator publishes **Passed** or **Not successful**, optionally adding a score and note. Before the scheduled exam time, tick **Publish before exam date** and confirm the explicit early-publication warning. This requires `screening.results.publish_early` as well as `applications.admit`; administrators have both by default. The early override, operator and scheduled date are retained in audit/history. The portal and email receive the outcome normally. Other staff can publish after the exam with their usual result permission.
4. For a successful applicant, admin reviews supporting documents and chooses **Issue provisional offer** when the required official application and screening payments and documents are verified. Passing alone does not issue an offer.
5. The provisional offer appears in the applicant dashboard. **Accept offer & continue to payment** opens Payments with the quoted acceptance fee first. The applicant pays, then completes the required acceptance form. Fees remain administrator-editable.
6. Admin sees **Complete clearance** when the required acceptance steps and document checks are done, then **Confirm final admission** to enable student access. Letter release remains separate and requires verified acceptance payment and approved letter settings.

The application popup shows the next available action or explains what is outstanding. Rejection requires a reason and confirmation where allowed. A recorded acceptance payment must be resolved before withdrawal; admitted records are managed in Students.

### Rescheduling

In **Already invited**, select one or more applicants whose result has not been published. Set the replacement exam date/time and venue, then choose **Reschedule & send invitations** and confirm. The current schedule is updated and a fresh portal/email invitation is created. Prior invitation history is retained. Repeating an identical request does not create duplicate invitations. Published results and existing admission offers cannot be reset through scheduling; any retake/result-correction workflow requires a separate authorised process.

## Temporary settings requested on 4 November 2026

Only missing letter fields are populated with clearly labelled example session/duration and example dates. Messages explain scheduling, successful results, unsuccessful results and admission offers without promising admission merely for passing.

The fee-schedule approval remains unchecked. Admission letters reject session or duration containing `temporary`, even if the appendix is subsequently approved. The school must replace the example session, duration and **all** example dates with its actual policy, check each programme's duration, and review the original appendix before release. These are not approved school dates or programme durations.

Changing settings does not reschedule existing exams, alter existing fee quotes, change an applicant's status or send retrospective notifications. Existing letters retain their original snapshots.

## Current payment limitation

Flutterwave currently uses demo checkout. While the configured demo mode is active, verified Flutterwave payments of the exact quoted amount unlock every stage on normal applicant accounts: form access, screening, offer, acceptance payment, acceptance form, clearance and student activation. No separate demo-account portal or preview-record selection is needed.

Gateway verification, ownership, amount/currency matching and duplicate protection remain mandatory. Historical transactions retain their original mode and demo receipts do not claim that real money was collected. Changing to live keys/mode never relabels past transactions as real receipts. Document release still requires the school's approved letter settings, and admission still requires the admin's decisions.
