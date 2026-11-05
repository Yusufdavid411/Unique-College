# Portal interaction patterns

- Application confirmations use `useConfirmation()` from `ConfirmationContext.jsx`.
  Await its boolean result before issuing any mutation. Supply an action-specific
  title, message, confirmation label and optional danger style. Cancellation,
  Escape or leaving the page must not submit the action. Capture form values
  before awaiting confirmation; React event targets are not retained across awaits.
- Do not add `window.confirm`, `window.alert` or `window.prompt`.
  Toasts report outcomes; confirmation dialogs ask for a decision.
- Document names are headings, not ambiguous download links. Administrators use
  `PrivateFilePreview` with `buttonText="View document"` and `allowDownload`.
  Opening a preview never downloads the file automatically. The download action
  appears inside the viewer and reuses the authenticated file already fetched.
- Document status labels and controls are stacked with clear spacing. Cards stack
  on small screens. A document preview must not close the enclosing application
  review panel when Escape is pressed.
- Keep one visually prominent next action, separate from correction/rejection.
- Verified fee success cards stay above Payment history for five minutes from their
  stored verification timestamp, then move into history automatically. The receipt
  is available on the success card immediately. The acceptance-form next action
  sits below that receipt, before history, and remains above history after expiry.
  Refreshing never restarts that display window.
- Application filters use progress stages, not notification audiences. Submitted
  applications is an aggregate of records with a submission; stage tabs identify
  the current stage. Admitted students have their own tab. Counts describe the
  loaded records, while search narrows the displayed group.
- Use reminders for incomplete applications, corrections and outstanding offers.
  Use confirmed batch actions to advance reviewed, eligible records. Never mark
  documents verified, publish screening results, clear an applicant or waive a
  payment just because a group is selected. Each mutation rechecks eligibility.
- Read-only progress views refresh on focus and every 15 seconds while visible.
  Silent background refreshes preserve forms and do not replace the page with a
  spinner. Form-editing routes do not poll or overwrite unsaved answers.
- Admin, staff and student navigation share PortalShell: a fixed side drawer,
  backdrop, Escape dismissal, focus trapping and inert background on mobile.

Workflow references: [Federal University Lokoja applicant guidelines](https://putme.fulokoja.edu.ng/index)
separate submission, admission decisions, acceptance payment and clearance;
[University of Ibadan acceptance instructions](https://ui.edu.ng/news/utme-direct-entry-acceptance-fee-payment-prospective-candidates-20252026-admission-exercise)
require an offer before acceptance payment. These inform next-step presentation,
not Unique College's prices, dates or admission policy.
- The applicant bell rings only while unread messages exist. Opening notifications
  clears the unread count using the existing read-state mechanism. Reduced-motion
  preferences disable ringing.
