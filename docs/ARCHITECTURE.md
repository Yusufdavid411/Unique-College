# Unique College Platform Architecture

## Purpose

This repository is one progressively delivered institutional platform, not separate
applications. It retains the existing React frontend, Node.js/Express REST API,
Prisma ORM, PostgreSQL database, JWT authentication, and role-based security.

## Current assessment

For the latest implementation and live validation checkpoint, see
STAGE_1_WORKLIST.md. The initial audit below records the starting position.

### Already in place

- React/Vite public website and administration interface.
- Express API with Prisma/PostgreSQL models.
- JWT sessions, password hashing, basic role checks, request validation, CORS,
  Helmet, rate limiting, and central error handling.
- Admin-managed news, gallery, contact, and initial admissions records.
- Applicant admissions workflow foundations: applicant account, saved drafts,
  documents, payment evidence, review status, and admission hand-off.

### Must remain deliberate Stage 1 work

- Replace the current coarse role enum checks with assignable roles and permissions
  while preserving existing administrator access during migration.
- Move all uploads behind a storage provider abstraction. The current local upload
  directory is appropriate for local/VPS development but is not durable on Vercel.
- Add audit events for sensitive changes and structured operational logging.
- Add reliable database connection, backups, and restore verification.
- Finish admissions review, receipt generation, document verification, and
  admission-letter workflows.
- Repair the production database connection before claiming that the live backend
  is healthy. The API health endpoint is reachable, but its database health check
  currently fails.

## Deployment topology

| Hostname | Responsibility | Notes |
| --- | --- | --- |
| uniquecollegekwali.com / www.uniquecollegekwali.com | Public website | React application; apex redirects to www |
| admin.uniquecollegekwali.com | Administration portal | Same React deployment; login/dashboard at hostname root |
| apply.uniquecollegekwali.com | Pre-admission portal | Same React deployment; registration/dashboard at hostname root |
| staff.uniquecollegekwali.com | Staff/faculty portal | Future Stage 3 UI; do not publish before built |
| portal.uniquecollegekwali.com | Student portal | Future Stage 4 UI; do not publish before built |
| api.uniquecollegekwali.com | Single REST API | Express API, shared PostgreSQL |

The purchased .com domain supersedes the proposed .edu.ng web addresses. Existing
account emails are unchanged. DNS does not create email mailboxes or portal features.
See CUSTOM_DOMAINS.md for configuration and verification.

Flutterwave Standard v3 form-fee checkout and automatic verification are implemented
behind PAYMENT_PROVIDER configuration. Merchant setup, live activation and its
production migration remain separate release gates; see FLUTTERWAVE.md. Existing
manual payments stay intact until activation. General institutional fee modules
remain Stage 6 work.

All web clients call the same API and PostgreSQL database. They must not duplicate
business logic.

### Vercel and Neon

- Use Vercel for the public and portal frontends.
- Use Neon PostgreSQL with a pooled DATABASE_URL for runtime and a direct
  DIRECT_URL for Prisma migrations.
- The API may run on Vercel only after uploads use object storage and the Express
  application is exposed through a serverless-compatible entry point. Vercel's
  filesystem is not durable storage.
- Until that change is complete, keep the Express API on a Node-compatible host
  (or VPS) behind api.uniquecollegekwali.edu.ng; this does not affect the React
  applications or database design.

## Portability rules

- PostgreSQL is the source of truth and must remain exportable with standard
  PostgreSQL tools.
- External URLs, database connections, JWT secrets, OAuth credentials, and storage
  configuration belong in environment variables.
- Storage uses an application-owned interface with local-disk and S3-compatible
  implementations, allowing a move from Vercel storage to a VPS volume without
  rewriting feature logic.
- Avoid provider-only database models and non-exportable file references.
- Backups include a tested PostgreSQL dump/restore process and a file manifest.

## Security model

The immediate model keeps the existing baseline role for backwards compatibility,
then adds configurable roles and permission assignments. Permissions, not a portal
name, decide access to a resource. A user may have multiple roles.

Initial permissions should cover applications.read, applications.review,
applications.admit, payments.read, payments.verify, content.manage, users.manage,
roles.manage, archives.manage, reports.read, and settings.manage.

Sensitive operations require authenticated users, server-side authorization,
validation, an audit record, and least-privilege access.

## Admissions and portal boundary

The pre-admission experience is the **Applicant Portal**. Applicants create an
account, save a draft, submit the admission form and evidence, follow review
progress, and download their own records. An authorised admissions officer reviews
and approves the application. On admission, the system creates a student portal
identity and requires a password change at first sign-in.

Generating a portal email identifier is not the same as creating a working mailbox.
Actual school email provisioning requires an approved Microsoft 365 or Google
Workspace integration and remains a controlled future addition.

## Google Drive archive design

Google Drive is an archive destination, never the live transactional database.

1. An authorised admin connects a school Google account with OAuth.
2. The system creates a structured archive folder and copies selected documents.
3. It verifies the copied files and stores an archive index in PostgreSQL.
4. Admin users can search, open, download, and request restoration from that index.
5. The original file remains until integrity is confirmed and a retention policy
   permits removal of the active copy.

The archive index will retain student/application identity, session, folder/file
IDs, storage checksum, archive date, actor, and restoration state.

## Stage plan

1. **Foundation:** API, Prisma/PostgreSQL, authentication/RBAC, file architecture,
   archive design, public site, admin dashboard, admissions, public-content
   management, Vercel/Neon readiness, security, logs, and backup/export.
2. **Academic structure:** departments, programmes, sessions, semesters, levels,
   courses, and staff/course assignments.
3. **Staff portal:** lecturer, HOD, registrar, admissions, and finance workflows.
4. **Student portal:** profile, academic information, documents, and notices.
5. **Academics:** registration, attendance, results, approvals, GPA/CGPA.
6. **Institutional services:** fees, payments, transcripts, graduation, reporting,
   and notifications.

No later-stage module should be built merely because the schema anticipates it.
