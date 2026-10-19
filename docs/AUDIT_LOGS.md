# Audit history

Role creation, updates, assignment/revocation, admissions status decisions,
document reviews, payment reviews, and application deletion now write an audit
entry in the same PostgreSQL transaction as the change. An audit failure aborts
the transaction. Entries include actor ID, action, target type/ID, and timestamp.
Role assignment actions include the affected role ID.

Passwords, tokens, full form contents, and document files are not copied into logs.
Actor and target IDs are retained even after a user or application is deleted.

GET /api/audit requires audit.read. It supports page (default 1), limit (default 25,
maximum 100), actorId, and targetId. The API offers no update or delete routes.
Database-owner access is outside this API boundary; these are operational audit
records, not tamper-proof external storage.

Deploy migration 202610190002_audit_logs and regenerate Prisma before starting the
updated API. Database integration testing still requires a working PostgreSQL
connection. Local tests check transaction use, error propagation, and safe fields;
they do not replace live rollback verification.

Next steps include admin audit screens, settings/content audit coverage, retention
policy, and database backup/restore verification.
