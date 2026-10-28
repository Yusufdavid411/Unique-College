# Flutterwave application form payments (activation pending)

This Stage 1 integration uses Flutterwave Standard v3 hosted checkout. No card
details pass through this application. Existing manually verified receipts remain
valid and downloadable. Later acceptance/school fee modules are not implemented.

## Activation

Keep PAYMENT_PROVIDER unset or manual until the school has an approved merchant
account, settlement details and successful test-mode verification. Do not paste
keys into chat, source control or frontend variables. Configure on the API only:

- PAYMENT_PROVIDER=flutterwave
- FLUTTERWAVE_SECRET_KEY: the merchant's v3 secret key (test first, live afterward)
- FLUTTERWAVE_WEBHOOK_HASH: a random, private hash matching the merchant dashboard
- FLUTTERWAVE_RETURN_URL=https://apply.uniquecollegekwali.com/payments

Set the merchant webhook to
https://api.uniquecollegekwali.com/api/payments/flutterwave/webhook, enable webhook
retry notifications, and configure its secret hash in both test and live modes.
Redeploy after environment changes. Do not activate live mode until the school
confirms the account and settlement beneficiary. This does not set up the previous
personal bank account as a Flutterwave settlement account.

Deploy the additive 202610280007_flutterwave_payments Prisma migration before the
updated API, preserving all existing payments. VPS deployments use the same env
variables, REST endpoints and PostgreSQL migration; no Vercel-specific payment API.

## Verification and safety

Authenticated POST /api/payments/flutterwave/checkout reads the fee, email and
currency from the stored application, not the browser. One serializable reservation
per applicant blocks existing pending receipts and duplicate fee purchases. Reuse
pending checkout links; initialization claims prevent concurrent checkout creation.
Provider timeouts keep the reservation rather than creating another payment.

POST /api/payments/flutterwave/verify accepts an owned reference. The server asks
Flutterwave's verify_by_reference endpoint; webhook processing uses transaction ID
verification. Redirect status and webhook amount/status are never sufficient proof.
Require successful provider status and exact reference, NGN currency and fee before
atomically setting VERIFIED and recording an audit event. A unique provider ID
prevents claiming one transaction for multiple records. Repeated notifications
are idempotent. Existing form-access middleware then unlocks forms and documents;
both admin/applicant can download the existing separate PDF receipt.

The v3 webhook checks verif-hash in constant time. This is the v3 shared-secret
scheme, not the distinct v4 HMAC scheme. Processing is awaited before acknowledging
success, so Vercel does not discard unawaited background work. Failures return
non-200 for Flutterwave retries. Never log keys or full provider payloads.

Automatic payments cannot be manually verified/rejected or withdrawn. Legacy
receipts retain their original admin review flow. When online mode is selected,
new manual receipt uploads are blocked. No automatic refund/dispute tooling or
background reconciliation worker is claimed; use provider reconciliation and the
school's finance support for disputes or unresolved expired sessions. Pending or
failed charge attempts keep their reservation because checkout may still retry or
settle later. They must not trigger a second fee payment. Checkout lasts at most
24 hours; unresolved expired sessions need finance reconciliation before a new
attempt can be safely enabled. Never mark a callback cancellation as proof no money
was received.

## Build verification checkpoint — 28 October 2026

The additive migration was applied and its columns/unique transaction index checked
in the existing isolated unique_college_test database only. Production schema and
payment mode remain unchanged pending merchant configuration. Migration checksum:
05eb194684b22bdc72b556750b89d47aba0bf153ef45f536bd831c908e88f44d.

The React payment screen was rendered using fictional, locally stubbed data: with
configuration unavailable, both checkout and Next remain disabled. No live charge
was created. The temporary preview file is not part of the deployed website.

## Required merchant test checklist

Test success, declined/cancelled checkout, delayed bank transfer, duplicate webhook,
webhook retry after outage, browser closed before return, session expiry, invalid
signature, wrong amount/currency/reference, duplicate clicks, forged callback,
other-applicant access, and identical downloadable receipts. Confirm the form
remains locked until verification. Test without changing real applicant decisions
or collecting live money. Merchant test/live end-to-end verification is pending
until credentials are configured; unit/stub tests are not a live charge test.

Official references:
- https://developer.flutterwave.com/docs/flutterwave-standard-1
- https://developer.flutterwave.com/docs/checksum
- https://developer.flutterwave.com/docs/webhooks
- https://developer.flutterwave.com/reference/verify-transaction-with-tx_ref
- https://developer.flutterwave.com/v3.0.0/docs/transaction-verification
