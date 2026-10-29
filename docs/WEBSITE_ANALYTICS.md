# Public website visitor analytics

## Dashboard

Admin Overview includes 7-, 30- and 90-day reports with page views, summed daily visitor
estimates, daily averages, a daily traffic chart/table, popular pages, referring domains,
and broad device categories. Reports use Africa/Lagos calendar dates, including zero-visit
days. Data begins accumulating after deployment; there is no historical backfill.

Visitor-days are not unique people across the entire date range. A daily HMAC identifier
is derived on the API from the network address and broad device category, using a secret
and the Lagos calendar date. Returning on another day creates a different identifier;
shared networks/devices can be grouped together. Referrer and device breakdowns count
page views, not distinct people. Bots and ad blockers make analytics estimates imperfect.

## Privacy and minimisation

Only the public .com website is instrumented. The API accepts a fixed public-page allowlist,
not applicant/admin/staff/student paths. It rejects query strings and fragments. Full
referrer paths, credentials, email addresses, form data, raw network addresses and full
user-agent strings are not stored in the analytics table. The client omits credentials and
HTTP referrer on collection requests. No cookies, local storage, browser fingerprints,
cross-day visitor identifiers or third-party analytics services are added.

Do Not Track and Global Privacy Control signals are honoured on the client and API.
Known bot/preview agents are ignored. Website privacy information is linked from the footer.
Existing infrastructure/security logs are separate from this analytics collection.

Raw page-view records use a rolling 90-calendar-day window. Older records are purged in
the next page-view write transaction. A dormant website therefore requires an operational
retention job if deletion must occur at an exact deadline. Reports never include older days.

## Endpoints and access

- POST /api/analytics/pageviews: unauthenticated, exact public-Origin allowlist, strict
  payload validation, UUID event deduplication, 30 requests/minute/IP best-effort process-local
  rate limit and a 300-page-view daily identifier cap. Collection does not consume the
  separate application-wide quota used by login and institutional API operations.
- GET /api/analytics/summary?days=7|30|90: JWT and analytics.read permission; private/no-store.

An Origin header is not proof of a human visitor and process-local rate limiting is not a
distributed abuse defence. Public counts can be spoofed and must not be used for payments,
admissions eligibility, billing or security decisions. Vercel/server edge controls can provide
additional operational abuse protection if traffic grows. The counter never changes admissions.

Ordinary visits to the same route are tracked once per route navigation. Query/hash changes
alone are not extra page views. React StrictMode effect replay is deduplicated client-side;
reusing a submitted UUID is also idempotent at the database primary key.

## Configuration, cost and portability

ANALYTICS_ENABLED=false disables collection server-side. No new paid analytics provider is
required; visits consume existing API requests and PostgreSQL storage/compute. Deploy the
Prisma migration before the new API. PostgreSQL remains authoritative and exports/backups
include the table, allowing the same code to run on a VPS.

ANALYTICS_HASH_SECRET can optionally be a separate random secret of at least 32 characters.
Without it, the server uses the existing JWT secret with domain-separated daily HMAC keys.
Never expose either secret to the frontend. Rotating the secret may change daily estimates.
