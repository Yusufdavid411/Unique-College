# Flutterwave application form payments (activation pending; sandbox retired)

## Current instruction — 28 October 2026

The user requested stopping sandbox testing and using only the live school
subdomains. Do not resume test charges, migrate test payments into production, or
activate the alternate merchant's key on the live API. Historical sandbox setup
below is retained for audit, not as an invitation to use those URLs. The retired
sandbox projects are paused, and the old website, API alias and API preview URLs
were checked to return 503 (deployment paused). Test data is preserved. Source
fallback routing sends retired sandbox visitors to the official applicant entry
without callback query parameters, and a retirement API guard returns 410 if the
retirement flag is deployed. Neither fallback is a reason to unpause testing.
The school's approved live Flutterwave credentials are still required before
enabling real automatic payments.

This Stage 1 integration uses Flutterwave Standard v3 hosted checkout. No card
details pass through this application. Existing manually verified receipts remain
valid and downloadable. Later acceptance/school fee modules are not implemented.

## Activation

Keep PAYMENT_PROVIDER unset or manual until the school has an approved merchant
account, settlement details and successful test-mode verification. Do not paste
keys into chat, source control or frontend variables. Configure on the API only:

- PAYMENT_PROVIDER=flutterwave
- FLUTTERWAVE_MODE=live for approved real payments, test for isolated testing
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

## Isolated sandbox setup

Never put another merchant's test key into the production API environment. Testing
must use the isolated unique_college_test database, a separate signing secret and
a local/preview frontend and API. Production applicants, receipts and fee access
must not change. Explicitly set FLUTTERWAVE_TEST_DATABASE_NAME=unique_college_test;
the configured DATABASE_URL must point there. Test mode rejects Vercel production
deployments, live merchant keys and redirects into the live school domains. Live
mode rejects test keys. Test payments display a warning and receipt PDFs are marked
not valid for admission.

The ignored backend/.env.flutterwave-test.local file holds the regenerated test
secret and a private webhook hash. Do not commit, screenshot or paste these
values into chat. The public and encryption keys are not needed for this hosted
checkout integration. Complete callback and webhook testing using Flutterwave's
official test cards only; never enter a real card in the sandbox.

An alternate merchant's sandbox can exercise the integration, but its checkout
branding belongs to that merchant. Passing sandbox tests does not approve Unique
College's live merchant account or change its settlement beneficiary. Before going
live, configure the school's own approved credentials and webhook hash, live mode,
production database/return URL and verify the approved settlement details.

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

Two sandbox Vercel projects use the same code, not separate business logic:
unique-college-payment-test (React) and unique-college-payment-test-api (Express).
Their preview deployments are assigned the matching .vercel.app aliases. Only
Preview-scoped variables are configured; do not promote these previews or deploy
them with --prod. The first automatically assigned production deployments had no
test configuration; use the explicit preview deployments and aliases instead.
The sandbox uses unique_college_test and an independent JWT secret. No live school
project environment or production admissions policy was changed. It reuses the
private storage provider solely for compatibility; payment testing does not upload
files or access production applicant records.

Authenticated Flutterwave API requests accepted the supplied sandbox key. The
provider returned checkout-v2.dev-flutterwave.com for test checkout links; that
exact HTTPS host is allowed only in test mode, while live mode remains restricted
to checkout.flutterwave.com. Do not broaden this to wildcard checkout domains.

Sandbox applicant entry: https://unique-college-payment-test.vercel.app/
Sandbox sign-in: https://unique-college-payment-test.vercel.app/login
Sandbox payment return: https://unique-college-payment-test.vercel.app/payments
The sandbox hostname selects the same root-level applicant routing as the live
applicant subdomain. Legacy /applicant links redirect to clean paths, preserving
callback query parameters. Never redirect sandbox registration or payment buttons
to the live applicant portal.
Sandbox webhook: https://unique-college-payment-test-api.vercel.app/api/payments/flutterwave/webhook
The sandbox fee was copied from the production admin-approved fee (NGN 20,000),
without changing any production setting. Callback, paid receipt and actual provider
webhook verification must still be confirmed after completing a simulated payment.
Deployed sandbox checks confirmed gatewayReady=true, the quoted fee of NGN 20,000,
and a genuine provider-hosted checkout link. The unpaid application update returns
402, forged references return 404, unsigned webhooks return 401, and a correctly
signed non-payment probe returns 200 without changing payment status. These probes
do not substitute for a real provider test-success event. Browser automation could
not confidently verify the Flutterwave dashboard URL, so saving the dashboard's
test webhook settings was handed to the user rather than attempted through another
UI mechanism. The webhook hash remains only in ignored files and sandbox API secrets.

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
