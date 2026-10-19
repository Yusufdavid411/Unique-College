# Stage 1 Worklist

## Implementation checkpoint — 19 October 2026

The repository now includes configurable access roles, role/staff administration
screens, audit history, transactional audit writes, private applicant downloads,
local/S3/private-Blob storage adapters, forced temporary-password change, JWT session
revocation, event management/public listings, CMS editing, validated publication
flags, shared admissions availability, portable local backup tooling, and CI with
a PostgreSQL service. Google Drive archival design is documented in ARCHIVE_DESIGN.md.

A dedicated Vercel API project, Neon database and private Blob store have been
created. The first six Prisma migrations were successfully applied and core
tables are reachable. Live API readiness and news publication/unpublication with
private image storage passed HTTP verification. The additive seventh migration
is applied in production and introduces the quoted application fee. Both API and
frontend admission updates are deployed. The older Render database has not been imported or
deleted. The historical worklist below is retained as planning context; completed
items above should not be rebuilt.

## Completed or underway

- Public website content and responsive leadership presentation.
- Leadership removed from the home page to keep the landing page focused.
- Applicant Portal foundation: registration, draft application form, uploads,
  payment evidence, applicant tracking, and administration review.
- Admissions state history and student portal credential hand-off.
- Public content administration for news and gallery.

## Required before Stage 1 is considered stable

1. The quoted-form-fee update is released. Registration precedes payment so
   applicants can track evidence; detailed forms unlock after verification.
2. Role/permission assignments and transactional audit logging are implemented.
3. Portable local/S3/private-Blob adapters are implemented; production uses Blob.
4. Neon URLs, secrets and CORS are configured. Complete custom portal/API DNS.
5. Add an approved payment gateway after the school supplies its provider account,
   fee amounts, payment policy, and receipt wording. Current evidence upload is
   manual verification, not card/bank checkout.
6. Applicant/admin application records and payment records support browser Print /
   Save PDF. Pending evidence is explicitly not a confirmed receipt. School approval
   of receipt wording and admission-letter content is still required.
7. Eighteen checks passed against an isolated PostgreSQL test database, including
   payment unlocking, price changes, file access, transactional rollback, guarded
   admission approval, credential hand-off and old-session invalidation.
   GitHub Actions cannot start because the GitHub account has a billing lock.
8. Dump/restore and storage-manifest procedures exist; perform a recovery drill
   before describing disaster recovery as verified. Non-forced updates cleared
   root/frontend dependency advisories. Backend advisories remain in Prisma's
   configuration merger and nodemon's watcher dependencies; do not force a Prisma
   major migration or downgrade nodemon merely to suppress audit output.
9. Google Drive archival architecture is documented for Stage 1. OAuth and actual
   archive/restore execution remain deferred; never delete the only copy.

## Decisions needed from the school

- Whether historical Render records need importing; the old database is untouched.
- Chosen payment provider and merchant account.
- Official programme list, application/acceptance fee rules, and receipt format.
- Official email provider and whether student mailboxes should be provisioned.
- Google Workspace account and archive retention policy.
