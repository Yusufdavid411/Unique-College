# School archive architecture

This is the Stage 1 archive design. Google OAuth and external archive execution
remain unconfigured. PostgreSQL is authoritative for live records and the archive
index. Google Drive holds archival files and exports only.

## Ownership and authorisation

A designated school account authorises the integration. Store OAuth refresh tokens
encrypted, with an encryption key supplied through environment configuration;
never put credentials in public settings or logs. Restrict connect/disconnect and
archive operations to distinct permissions. A connection must be revocable.
Prefer a dedicated school archive folder and the narrowest Drive scope compatible
with the approved workflow. A staff member's personal account is not the owner.

## Data model to implement with the integration

- Archive job: actor, selected source IDs, idempotency key, state, checkpoint,
  start/completion times, failure code, and retention decision.
- Archive record: institution reference, source type/ID, minimal searchable student
  identity, session where available, export version, destination folder ID,
  verification state, source snapshot hash, and restoration state.
- Archive file: source storage key, Drive file ID, original filename, size, source
  SHA-256 digest, verified digest, and verification time.
- OAuth connection: account identity, encrypted token, scopes, and revocation state.

Archive metadata must survive source-file removal and student lifecycle changes.
Search results return metadata; downloading a file requires a fresh permission
check. Drive sharing must remain private to the approved school account/team.

## Copy, verify, then retain

1. Freeze a versioned export and file manifest for the selected records.
2. Create a job with an idempotency key; reuse its folder on retry.
3. Copy files to organised folders, such as school/session/student-reference.
4. Verify content by downloading the uploaded bytes and comparing their SHA-256
   digest and byte length with the source manifest. A successful upload response
   alone does not establish integrity.
5. Commit the verified index and audit event to PostgreSQL.
6. Offer an authorised, separately reviewed retention action only after every file
   and export is verified and independent backups are available. The first release
   should retain active copies automatically.

Retry incomplete jobs using checkpoints. Never treat failed, partially copied or
unverified jobs as archived. Quota exhaustion, token expiry and missing files leave
the original files intact. Do not use asynchronous work after an HTTP response on
serverless hosts; use a durable job runner for execution.

## Search, download and restore

Search the PostgreSQL archive index from the admin dashboard. Fetch Drive files
server-side after permission checks. Do not expose refresh tokens or public Drive
links. Restoration first verifies archived hashes, copies into the selected active
storage provider, validates record schema/version and conflicting IDs, then commits
an audited restore transaction. Restoring never deletes the archive copy.

The archive index and encrypted connection data belong in regular PostgreSQL
backups. A PostgreSQL backup without its matching encryption key cannot restore
OAuth access. Account ownership, retention, data access, and recovery drills must
be agreed with the school before activation.
