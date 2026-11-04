# Password recovery

Admin, applicant, student and staff login portals offer **Forgot password?**. Enter the registered account email, then use the emailed link to choose a new password. Student usernames and application numbers are not email addresses; use the original registered email for recovery.

Administration → Staff accounts → **Send password-reset link** also accepts an applicant, student or staff email. Only accounts with `users.manage` can send links. Administrators never view or choose the user's new password. There is no password export or readable password list.

## Activation

Apply migration `202611030015_password_resets`, generate Prisma Client, and deploy both applications. Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` securely on the API's production environment. Verify the school sending domain in Resend. Redeploy after environment changes. Never paste keys into chat or GitHub.

Without Resend configuration, recovery returns a clear service-unavailable notification, not a false success. With configuration, the public response is deliberately generic for registered, missing, inactive or throttled accounts. Provider failures invalidate the undelivered token; request again later. Provider acceptance does not guarantee inbox delivery: check spam and Resend delivery logs, without sharing reset links.

Links use the account's canonical portal: `admin.uniquecollegekwali.com/reset-password`, `apply.uniquecollegekwali.com/reset-password`, `staff.uniquecollegekwali.com/reset-password`, or `portal.uniquecollegekwali.com/reset-password`. Raw tokens travel in the email URL fragment, are removed from browser history on opening, and are submitted only in a POST body. Do not reload the reset page; request another email if needed.

## Security

- 32-byte cryptographically random token; PostgreSQL stores only SHA-256 hash.
- 30-minute expiry, single use, one current token per user, 60-second account cooldown, additional IP rate limiting. IP limits are instance-local on serverless hosting; account cooldown is database-backed.
- Atomic token consumption, password change, session-version increment and audit event; concurrent/replayed tokens cannot change a password twice.
- Changed password invalidates existing login sessions and old reset links. Inactive accounts cannot reset.
- Password changes and resets require at least 8 characters, uppercase, lowercase and a number, at most 72 UTF-8 bytes. User-facing guidance emphasizes strong passwords without specifying a character count. Passwords remain bcrypt hashes.
- No automatic login after resetting. Sign in again through the relevant portal.

Complete a real delivery test after Resend is configured: request from each portal, open email, reset, verify old password and old sessions fail, and verify reuse/expired links fail. Tests must not send real email or reset existing users without authorization.
