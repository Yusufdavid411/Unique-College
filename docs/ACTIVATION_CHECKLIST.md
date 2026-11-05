# Live admissions activation checklist

Updated 3 November 2026. External payment/email accounts are not ready yet; the administrator explicitly controls official school session, dates and durations. Do not invent these values or mark external services verified merely because an environment variable exists.

## In the admin portal

Open **Settings → School settings → Platform setup**. Refresh checks after saving settings or redeploying environment changes. This is a read-only, permission-protected check of configuration, PostgreSQL connectivity, school templates and the admissions email queue. It never returns API keys, tokens or connection strings. `Configured` means configuration exists, not proven merchant approval or inbox delivery.

The admission-letter item lists every missing school-approved value. **Set official letter details** opens the relevant settings panel. Add academic session, default programme duration, admission effective date, registration opening/deadline, O-level deadline and lectures start date. These populate future admission letters; session also populates related school forms. Review the original fee appendix before approving its attachment. Individual programme duration can be overridden by the registrar at release. Existing quotes and issued letters are preserved.

Missing/inconsistent dates block letter issuance, not a successful payment. The fee appendix is optional and is omitted unless approved; it does not block letters or admission. Never ask an applicant to pay again to fix missing letter settings.

## Resend: when the school account is ready

1. Sign in to the school's Resend account. Add a school-owned sending domain under Domains.
2. In Namecheap Advanced DNS, add **only the exact records Resend supplies**. Preserve existing website CNAME/A records and mailbox-provider MX records. Do not replace root-domain MX records with sending/return-path records without checking the host shown in Resend.
3. Wait for Resend's domain verification. Set the sender to, for example, `Unique College Admissions <no-reply@uniquecollegekwali.com>` when that exact domain is verified.
4. Create a least-privilege sending API key for the school domain. In Vercel's **unique-college-api** project, Production environment, set `RESEND_API_KEY` as a secret and `RESEND_FROM_EMAIL` to the approved sender. Do not place either key in frontend variables, GitHub, screenshots or chat.
5. Redeploy the API. Refresh Platform setup. Perform a password reset on an authorised school-owned test account and verify the canonical portal link and expiry; then send an admissions notification to that authorised account. Check both inbox and Resend delivery logs.

Resend is an application-email sender, not a student/staff mailbox service. Setting up a sender does not create inboxes, passwords or email licences for students.

Official guidance: [Verified domains](https://resend.com/docs/dashboard/domains/introduction), [API key management](https://resend.com/docs/dashboard/api-keys/introduction).

## Flutterwave: when the school merchant is approved

1. Keep test mode isolated until the school is approved for live collection. Never substitute another institution's live merchant account.
2. Configure the backend project with `PAYMENT_PROVIDER=flutterwave`, `FLUTTERWAVE_MODE=live`, the school's live `FLUTTERWAVE_SECRET_KEY`, a matching securely stored `FLUTTERWAVE_WEBHOOK_HASH`, and `FLUTTERWAVE_RETURN_URL=https://apply.uniquecollegekwali.com/payments`.
3. In the merchant's live webhook settings, configure `https://api.uniquecollegekwali.com/api/payments/flutterwave/webhook`, using the same secret hash and the required retry/v3 settings. Test and live dashboard settings are separate.
4. Redeploy the API and refresh Platform setup. `Configured` does not mean a live transaction has succeeded. With school approval, perform a controlled live transaction and verify the exact NGN quote, provider status, portal unlock, separate receipt and webhook replay/idempotency.
5. Confirm who bears processor fees before collecting from applicants. Do not change expected amounts on the frontend or accept an underpayment/overpayment as the quoted fee.

Current policy defaults: application NGN 5,000; screening NGN 2,000; acceptance NGN 5,000. Admin can edit each policy; existing individual quotes are not silently repriced.

## Automatic notification retries

The API's Vercel configuration schedules a daily GET to `/api/maintenance/notifications` at 06:15 UTC (07:15 WAT; actual invocation may occur within that hour on Hobby). Requests require `Authorization: Bearer <CRON_SECRET>`, with a unique secret of at least 32 characters stored in the API project. No secret may be put in query parameters. Missing/wrong credentials return 401; an unconfigured email sender leaves records queued and does not falsely mark them sent.

Initial delivery is attempted when the record changes. The daily fallback processes up to 20 eligible notifications with pacing; manual Screening → Email delivery queue processes five. The portable worker is `npm run notifications:retry --prefix backend`. All use the same eligibility and atomic claim logic. Duplicate invocations cannot claim the same fresh notification twice. Old uncertain deliveries are excluded from automatic replay outside the provider idempotency safety window; these need operator investigation, not a blind resend. At larger volumes, provision a more frequent scheduler/worker after checking hosting limits. Do not assume a daily fallback provides minute-level delivery guarantees.

Official guidance: [Securing/managing Vercel cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [cron usage and scheduling limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Final acceptance test before opening live admissions

- Register → pay application quote → automatic verification → form unlock → submit → portal under review.
- Schedule only selected eligible applicants; confirm invitation's Nigerian time, venue, fee and email/portal notice.
- Pay screening quote → sit exam → publish individual result → only successful candidates receive offers.
- Accept offer → pay acceptance quote → automatic original-template letter after valid configuration → complete acceptance form.
- Verify admin and applicant download matching individual documents and separate receipts; test another account cannot access them.
- Complete registry clearance → final admission → same account activates student portal; old sessions/one-time handoffs cannot be replayed.
- Complete student record/guarantor details, obtain real handwritten signatures, verify original PDF layouts and registry access.
- Export PostgreSQL and uploaded files, then prove restoration into an isolated environment. Configuration checks do not replace a backup restoration drill.

Never run payment tests against an unintended live account or send notifications to real candidates while testing. Automated integration tests use a dedicated PostgreSQL test database and a stubbed payment provider, not real charges.
