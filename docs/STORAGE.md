# Portable upload storage

STORAGE_PROVIDER=blob uses a private Vercel Blob store via the same upload/download
interface. Configure BLOB_READ_WRITE_TOKEN through the API project's store connection.
The database paths and object keys remain the same when moving from Blob to S3 or
local storage. Blob downloads remain behind API permission checks.

STORAGE_PROVIDER=local uses UPLOAD_ROOT on a persistent volume. STORAGE_PROVIDER=s3
stores new files in a private S3-compatible bucket and streams downloads through
the same authorised API. S3 configuration: S3_BUCKET, S3_REGION, optional S3_ENDPOINT,
S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and optional S3_FORCE_PATH_STYLE=true.
Standard workload credentials are also supported when explicit keys are omitted.

The database stores provider-neutral paths such as /uploads/documents/<uuid>.pdf.
Object keys preserve the suffix documents/<uuid>.pdf, gallery/<uuid>.jpg, etc.
Do not make the bucket public. Published website images are served by the API only
after checking a published CMS record. Applicant files require owner/reviewer access.

Multipart files are temporarily staged locally, checked for supported file headers,
and uploaded to object storage before saving their database record. Header checks
do not replace malware scanning. Failed requests can leave unreferenced objects;
do not automatically delete uncertain objects until a reconciliation procedure can
prove they are unreferenced and outside the retention window.

When switching providers, pause writes, copy all referenced files with identical
keys, verify hashes against a manifest, test public/private downloads, then change
the provider setting. Keep the original copies until the migration is verified.
The current backup command copies local volumes only; for S3, export the bucket
with its provider tools and pair that export with the PostgreSQL backup. Never
back up a staging directory as if it were the authoritative object store.

Object-storage execution needs a configured bucket and has not been tested against
a school's remote account yet. Local storage download and access checks are covered
by HTTP tests. API multipart request limits on the deployment platform may be lower
than the application's 10 MB limit; direct signed upload support is a later addition
if the chosen host requires it.
