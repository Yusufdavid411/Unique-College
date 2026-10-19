# Vercel and Neon deployment

Use two Vercel projects from the same GitHub repository: the existing React frontend
project and an Express API project with its Root Directory set to backend. They
share one Neon PostgreSQL database. Assign public/admin domains to the frontend
project and api.uniquecollegekwali.edu.ng to the backend project. Later staff/student
UIs call this same API. Root-domain routing for future portals is not yet enabled.

The API exports the Express application using Vercel's recognised src/app.js entry.
backend/vercel.json generates Prisma Client during build. Run migrations separately
against the approved database before releasing; migrations are deliberately not
run from ordinary HTTP requests or automatically against preview databases.

## API environment

- NODE_ENV=production and a random JWT_SECRET of at least 32 characters.
- DATABASE_URL: Neon pooled runtime URL with TLS enabled.
- DIRECT_URL: direct Neon URL, consumed by the Prisma migration wrapper and backups.
- CLIENT_URL: exact comma-separated public, admin and approved preview origins.
- PUBLIC_BASE_URL: the API's HTTPS origin.
- STORAGE_PROVIDER=blob with its private store token, or STORAGE_PROVIDER=s3 with
  S3_BUCKET, S3_REGION and applicable endpoint/credentials.
- ADMIN_EMAIL and a strong ADMIN_PASSWORD for initial seed creation only.

Use npm run prisma:deploy and npm run seed from backend in a controlled deployment
environment. Existing admin passwords are preserved unless explicitly reset.
Production startup fails clearly if the API lacks durable storage or a strong JWT
secret. Keep credentials in deployment secrets, never GitHub or frontend variables.

## Frontend environment

VITE_API_URL must be the API origin without /api. Build the frontend again after
changing it. Preserve the existing SPA rewrite configuration at repository root.
All public content, admissions status and private downloads come from the shared API.

## Uploads

Vercel currently limits function request payloads to 4.5 MB. The API caps multipart
files at 4 MB on Vercel, with temporary staging in the writable temporary directory.
Local/VPS deployments retain a 10 MB file limit. A private object-store bucket is
mandatory on Vercel. Before switching storage providers, migrate existing objects
with unchanged keys and verify their hashes, then keep the old copy until verified.

## Acceptance checks

Verify /api/health/db, admin sign-in, admissions open/close, publishing/unpublishing,
staff creation and role revocation, audit history, private file isolation, temporary
password change and session revocation. Exercise S3 uploads/downloads against the
actual bucket. Verify backup restoration into an isolated PostgreSQL database.
The repository build and tests do not establish successful production deployment.

References:
- https://vercel.com/docs/frameworks/backend/express
- https://vercel.com/docs/functions/limitations
- https://neon.com/docs/guides/prisma
