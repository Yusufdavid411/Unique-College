# Applicant registration journey

The registration sequence is **confirmed application payment → saved complete application form → supporting documents → final submission → under review**. Screening and acceptance are later admissions workflows, not substitutes for completing the initial registration.

## One source for stage completion

The authenticated applicant dashboard API returns `journey`, calculated by `backend/src/services/applicantJourney.js`. The server uses the same required-form and required-document helpers for final submission. The dashboard, progress strip, navigation locks and Documents submission control consume that result rather than making independent guesses based only on education-row counts or declaration flags.

- Application payment must satisfy the existing exact amount, currency and test/live mode checks.
- Required form fields, five complete O-level entries and declaration must be saved. Middle name remains optional.
- Each required document type must have an uploaded, non-rejected record. Pending files are eligible for submission because administrative review happens afterward. A rejected file requires a replacement.
- Each category has one current file. Replace file atomically supersedes the previous copy and resets the new copy for admissions review. Older copies remain privately retained for audit, not listed or submitted as additional credentials. Applicant/student APIs, clearance checks and document reviews use only current files; historical files cannot satisfy current requirements. A partial unique PostgreSQL index prevents concurrent duplicate current uploads. The migration retains the newest existing file per category without deleting document history or stored files.
- The dashboard's **Complete registration** button resumes at Payment, Application form or Documents according to the first incomplete saved stage. When uploads are complete, Documents remains the next stop until the applicant explicitly submits.
- A returned application resumes corrections and can be resubmitted from Documents. Submitted/accepted applications are not silently reopened. Existing submitted records can still view their documents even if their historical form lacks newer fields.

## Navigation and final submission

- Payment has Previous: Dashboard and a Next: Application form control gated by confirmed payment.
- Application form has Previous: Payment, Save draft and **Save & continue to Documents**. Continue saves the draft, checks refreshed server progress, then navigates; it never submits for review.
- Documents has Previous: Application form, clear missing-document guidance, optional on-screen review of saved details and the sole **Submit for review** control. Uploads finish before submission; double-click/concurrent upload/submit attempts are guarded.
- Previous and Submit for review sit in a separate, non-sticky page action row below the review card. Before submission, a saved file is labelled **Uploaded**; after submission it is **Awaiting review** until the school verifies it. A rejected credential is labelled **Replace required** with its review note.
- Documents is disabled until payment and required form completion. The API enforces form completion before accepting an upload, before file parsing/storage; final submission independently rechecks requirements. Qualified applicants can return to the saved form and documents before submission.
- Completed stage cards show completion and remain usable to revisit those stages. The sidebar section is **My admission**, not Applicant steps.
- After successful submission, the dashboard displays Under review instead of a registration-resume action. Other later statuses retain their real admissions status.
- If refreshed progress cannot be loaded, the portal asks for a refresh instead of interpreting a network failure as an unpaid fee or instructing a duplicate payment.

## Downloads and fees

The print centre uses the shared official PDF download component. It does not create a second browser-printed admission notice. Application PDF eligibility, admission-letter release and separate verified payment receipts keep their existing server gates. Unverified/cancelled attempts are not shown as downloadable receipts. Payment evidence, where present on legacy verified records, is labelled separately from the official receipt.

Pricing is unchanged, explicitly reconfirmed by the administrator: application NGN 5,000, screening NGN 2,000, acceptance NGN 5,000. Existing individual quotes remain intact.

## Verification

`applicant-journey.test.js` covers first-incomplete-stage routing, exact payment gates, partial fields/results, optional middle name, rejected/replaced credentials and the UI submission placement. `applicant-journey.integration.test.js` runs against a dedicated test PostgreSQL database: unpaid form rejection, paid but incomplete form upload rejection, saved-form progression, required uploads, returning to edit a saved form, final submission, under-review progress and duplicate-submission rejection. It creates and cleans only its own fixtures; no real Flutterwave charge or real applicant email is sent.
