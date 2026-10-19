# Deployment, privacy and recovery

## Required deployment sequence

1. Back up the existing database and uploaded files.
2. Confirm a working PostgreSQL connection. Use a Neon pooled DATABASE_URL for
   runtime and a direct connection for deployment migrations and backups.
3. Configure JWT_SECRET with a unique random secret of at least 32 characters.
   Production startup rejects missing or placeholder secrets.
4. Configure CLIENT_URL as a comma-separated list of exact portal origins.
   Unrelated Vercel deployments are no longer permitted by CORS.
5. Generate Prisma Client and run prisma migrate deploy before starting this API.
6. Run npm run db:check from backend, then verify API health/db, sign-in,
   publishing, private downloads, admissions control, role management and audit.

Verified 19 October 2026: seven migrations are applied to the dedicated Unique
College Neon database. The Vercel API passes database readiness, administrator
sign-in, news/image publishing and unpublishing checks. The website uses that API.
The older Render database is preserved and has not been imported or deleted.

## Applicant files

The old blanket static upload route has been replaced. Only images referenced by
published news/gallery are public. Other files use GET /api/files?path=... with a
Bearer token. Owners and admissions reviewers can download applicant records.
Content managers can download CMS images. Responses disable private-file caching.
Production uses private Vercel Blob; local development uses UPLOAD_ROOT unless
another portable storage adapter is configured.
Previously public URLs cannot retract copies already downloaded by third parties.

## Passwords

Temporary passwords now enforce a password-change screen. Password changes and
newly issued admission credentials increment the user's session version, revoking
old JWTs. Password changes require the current password and are audited without
recording either password. Database errors during authentication now propagate as
service errors instead of being reported as invalid credentials.

## Portable backups

Install pg_dump compatible with the database server. From backend, configure a
direct DIRECT_URL and run npm run backup -- <new-directory-outside-upload-root>.
The directory's parent must exist; an existing output directory is never replaced.
PG_DUMP_PATH can point to a local pg_dump executable. Secrets are passed in child
process environment variables and are not printed or written in the manifest.

The tool creates database.dump, copies uploads and verifies SHA-256 hashes, then
writes manifest.json only on successful completion. Failed backups may leave partial
output with no manifest; never treat that directory as a completed backup. Pause
writes during the entire operation to coordinate the database snapshot with files.
Do not run backups from a public HTTP request. Restrict filesystem access and keep
encrypted copies in separate storage. The export itself is not encrypted.

To verify recovery, use pg_restore --list database.dump, then restore to a new,
isolated PostgreSQL database with pg_restore --no-owner --no-acl --exit-on-error.
Copy uploads to its test UPLOAD_ROOT, validate checksums against the manifest, run
db:check and smoke-test the app using that isolated connection. Do not restore over
production until a separate recovery plan and backup are approved.

This local-volume backup command deliberately refuses S3/Blob mode: it cannot
silently omit production objects and report a complete backup. Export private
objects separately with an authorised provider client and keep them with the
database dump. A full production dump/object recovery drill is still outstanding;
PostgreSQL client tools are not installed on this workstation.

## Remaining external configuration

- School payment merchant account and approved fee policy.
- School Google OAuth configuration before future archive execution.
- Domain DNS and school mailbox provisioning.
- GitHub Actions account billing lock prevents CI jobs from starting. Eighteen
  tests passed separately against the isolated Neon test database.

The UI now exposes Roles and Audit history in the existing admin dashboard.
