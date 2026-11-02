# Student portal foundation

## Scope and researched structure

The student portal is the same React deployment and shared Express/PostgreSQL
backend at https://portal.uniquecollegekwali.com. It is not a new identity store.
The school requested the portal foundation after the admissions handover; minimal
structured academic records are included as prerequisites, not a full implementation
of results, attendance, course registration, billing or transcripts.

Public university guidance informed the information architecture, not copied private
administration screens or visual branding:

- [Oxford Student Self Service and registration](https://www.ox.ac.uk/students/registration):
  continuing identity, personal record maintenance, academic information and explicit
  confirmation steps; student registration is distinct from receiving an offer.
- [UCL updating student details](https://www.ucl.ac.uk/study/current-students/student-status/updating-student-details):
  student contact details are maintained in the central record; formal identity
  corrections have a separate process.
- [University of Ibadan student portal](https://student-portal.ui.edu.ng/login):
  dedicated student access using institutional identifiers. We do not copy its fees,
  registration deadlines or institution-specific eligibility requirements.

## Student experience

- Dashboard: actual identity, next action and up to three published notices.
- My profile: authoritative admission identity is read-only; phone, address and
  next-of-kin contacts are editable with optimistic concurrency and audit history.
- Academic record: assigned programme, department, session and level, with explicit
  student confirmation. No session, matriculation status or current level is guessed.
- Documents and receipts: the existing accepted application PDF, separate verified
  payment receipts and private supporting admission documents. No new public file URLs.
- Announcements: published student notices only; excerpts open into full notices.
- Account security: existing password controls, with student activation on first
  post-admission sign-in.

White backgrounds, restrained blue accents, progressive disclosure, responsive
sidebar/drawer, keyboard focus handling, Escape-to-close and skip navigation are
shared through PortalShell. The desktop menu and mobile toggle use complementary
breakpoints. Portal pages are lazy-loaded to avoid adding the entire student UI
to the first public-page bundle.

## Identity and secure cross-subdomain transfer

Final admission creates one StudentProfile linked uniquely to the existing User
and original Application. The migration backfills already admitted students without
changing their password, admission or payment history. Students sign in with their
existing login email or assigned username; the reserved officialEmail is not a
provisioned mailbox.

An admitted user signing in on apply is transferred to the student host. JWTs are
never placed in a URL or shared through broad-domain cookies. The API generates a
60-second, random, one-use code stored only as a SHA-256 hash. Redemption also
requires an HttpOnly, Secure-in-production, SameSite=Strict, API-host-only cookie
bound to the originating browser. The code is carried in a fragment, removed from
history before redemption, and cannot be replayed after use, expiry or session
revocation. Origin-scoped applicant/student/admin session keys remain separate.

Transfer expiry falls back to normal student sign-in. Students who still need a
password change must complete it before accessing records. A student role alone
is insufficient: an admitted application and matching linked profile are required.
The permanent student portal has a dedicated login; applicants cannot use it early.

## Administrator workflow

1. Complete final admission in Applications; the student appears in Students.
2. Configure the school's real departments, programmes, sessions and levels in
   Academic setup. No sample academic records are seeded in production.
3. Open Students → student's name and assign programme/session/level.
4. The student reviews and confirms those details. Confirmation is not proof of
   course registration, fee clearance or completion of all institutional enrolment.
5. Create a draft student announcement and publish when ready. Unpublish through
   the same editor; draft records are never returned by student notice endpoints.

Confirmed academic assignments cannot be silently overwritten. Unconfirmed
assignments can be corrected by an authorised officer. Deactivating a catalogue
entry prevents new use while retaining historical records. A formal correction,
transfer and academic progression workflow remains later work.

## API and permissions

- POST /api/auth/student/login: credential validation and admitted-student check.
- POST /api/auth/student/handoff and /handoff/redeem: short-lived browser-bound transfer.
- GET /api/student/me, PATCH /api/student/profile: current student only, no client
  user ID accepted. The original admissions form is not edited by contact updates.
- POST /api/student/enrolments/:id/confirm: owner-only, versioned confirmation.
- GET /api/student/announcements and /:id: published notices only, paginated.
- GET /api/students/:applicationId: students.read.
- POST /api/students/:applicationId/enrolments: students.manage.
- GET /api/academic/options: students.read or academic.manage.
- POST /api/academic/:type and PATCH /:type/:id: academic.manage.
- GET/POST/PATCH /api/announcements: announcements.manage.

New permissions are explicit and assignable through the existing role system.
Administrators retain their current permission foundation. This does not implement
the separate role-specific staff portal. Sensitive mutations and audit entries are
transactional; student reads disable caching and reject other user roles.

## Deployment and portability

Migration 202611020012_student_foundation adds independent profile, academic
catalogue, enrolment, notice and handoff tables using portable PostgreSQL types.
Foreign keys prevent silently deleting student history. No storage-provider change,
new JWT signing secret or additional paid service is needed.

Vercel project uniquecollegekwali serves the student hostname. Namecheap CNAME
portal points at the exact project target provided by Vercel. API CLIENT_URL must
include https://portal.uniquecollegekwali.com while retaining existing origins.
No wildcard CORS or credential-bearing redirect URLs are permitted. Clean host-root
routes are used; legacy /student prefixes redirect to the same student subdomain.

## Deliberately not implemented

Course catalogue/prerequisites, semesters, course registration, lecturer assignments,
attendance, results and approvals, grade scales/GPA/CGPA, timetables, institutional
invoices/balances, transcripts and graduation are later modules. The UI explicitly
states these services are not enabled rather than publishing fake figures or inert
menu items. School email provisioning and password-reset email delivery remain
separate configuration/features. Google Drive archives remain a planned subsystem.

## Verification

The isolated PostgreSQL integration suite covers admitted membership, ownership,
contact updates without modifying admissions, stale edit rejection, hashed and
browser-bound transfer, replay/expiry rejection, academic assignment/confirmation,
protection of confirmed assignments, published-only notices and audit persistence.
Fixtures and their academic/announcement records are cleaned up after execution.
These checks do not imply live payment activation or real mailbox provisioning.
