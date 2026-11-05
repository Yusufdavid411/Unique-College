# Flutterwave payments — one admissions workflow

## Current configuration

All normal applicant accounts use the same website, API and PostgreSQL database.
There is no separate payment sandbox portal or sandbox API.
The two retired Vercel projects were deleted on 4 November 2026 at the user's request.

Flutterwave remains in demo checkout mode:

- `PAYMENT_PROVIDER=flutterwave`
- `FLUTTERWAVE_MODE=test`
- The saved Flutterwave test secret key and webhook hash remain backend-only.
- Return URL: `https://apply.uniquecollegekwali.com/payments`
- Webhook: `https://api.uniquecollegekwali.com/api/payments/flutterwave/webhook`

No additional database, deployment or restricted-demo flag is required. Selecting
the provider's demo mode with matching credentials enables the same admissions
workflow on the official portal.

## Verified payments unlock the complete process

Normal accounts may proceed through application purchase, form submission, review,
screening payment, scheduling, outcome, provisional offer, acceptance payment,
acceptance form, clearance and final student activation. Backend payment eligibility
is shared across these stages. Administrators still review documents, publish
results and make admission decisions; payment alone never issues admission.

No payment records are rewritten as real transactions. Mode flags are financial
history, not a separate application workflow. Receipt PDFs accurately indicate
when no real money was collected. Live and demo modes share the same screens.

## Switching to live payments

Configure the school's approved live Flutterwave secret key and webhook secret,
set `FLUTTERWAVE_MODE=live`, and redeploy the API. Configure the webhook in the merchant's
live dashboard as well. No frontend rebuild or separate admissions flow is needed.

Old demo payments remain demo transactions and do not satisfy new live-mode fee
verification. Already-created student records and previously issued documents are
not deleted or rewritten when credentials change. Review outstanding demo-funded
accounts before a live rollout; do not charge users without school approval.

## Verification and integrity

- Checkout uses the stored quote, currency and server-generated reference.
- Verify transactions against Flutterwave; browser redirects never prove payment.
- Require transaction ownership, exact amount/currency and matching gateway mode.
- Validate webhook secrets, prevent transaction replay and avoid duplicate checkout.
- Keep storage/file portability, backups, audit history and password-reset services.
- Session, duration and valid letter dates remain required. The optional fee
  appendix is attached only when approved; it never blocks letter release.

Automated developer checks remain in the repository to protect these invariants.
They are not user-facing test accounts, portals or application restrictions.
