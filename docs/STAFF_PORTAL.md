# Staff portal foundation

## Research and design decision

The [University of Texas at Austin registrar](https://registrar.utexas.edu/faculty/clips) ties class-roster access to instructors of record and authorized assistants. Assignment to a class matters in addition to having a faculty account. [National Louis University's adviser guide](https://nl.edu/media/retain/RetainAdvisorGuide.pdf) describes assigned advisees and term-filtered advising work.

Our design follows this distinction: **roles determine allowed actions; assignments determine whose records are available**. We do not copy foreign school policies, fees, grades or legal requirements. This release implements the adviser relationship, not a pretend course roster. Lecturer/course assignments will use course offerings plus student course registrations when those modules are built.

## Admin setup

1. Administration → Staff accounts → Create staff account. No public staff registration exists. Share the one-time displayed temporary password privately; it is not recoverable later.
2. Administration → Roles: create the responsibilities the school actually uses (Registrar, Admissions Officer, Bursar, HOD, Lecturer, Academic Adviser, or another name). Select permissions intentionally; the name itself grants nothing.
3. Assign roles to staff on the same Roles page. New staff start without additional permissions. Staff open their workspace immediately and can change their password later under Settings. Changing the initially issued password is recommended but not mandatory.
4. For advising, grant `advisees.read` (View assigned students). Do **not** grant broad `students.read` or management permissions merely to let a lecturer see their own advisees.
5. Complete final admission, create the real academic options, and assign a programme/session/level to the student. An applicant is not a student just because an application or payment was verified.
6. Staff accounts → Student adviser assignments → Find students & staff. Choose the adviser and the admitted student's session record. Multiple advisers can be explicitly assigned where school policy requires it.
7. Remove assignments to revoke access without deleting history. Disabling a staff account revokes sessions. Removing `advisees.read`, deactivating the academic session or removing an assignment blocks access on the next API request.

`staff.assignments.manage` controls assignment administration separately from `users.manage` and `roles.manage`. Administrators retain all permissions. Every assignment/revocation is audited atomically. Assignments to unavailable students or ineligible staff are rejected.

## Staff and student experience

- Canonical staff root: `https://staff.uniquecollegekwali.com/`; root opens sign-in when signed out, dashboard when signed in.
- Staff-only login, isolated local session key, existing JWT/session-version authentication and shared backend/database. No admin impersonation and no automatic administration access.
- Dashboard shows assigned role names and actual active student-session assignment count. Empty states are honest, not sample production records.
- My students is permission-gated and paginated. The API always scopes records to the authenticated staff ID, including guessed individual assignment URLs.
- Roster shows name, student number, registered email, programme, department, session, level and academic confirmation state only. It does not expose guardian contacts, admission files, password hashes, payment receipts or broad student profiles.
- Student dashboard shows their active academic advisers and contact emails from the same assignments. Students cannot create adviser assignments or view other students' relationships.
- Profile & access displays roles/permissions read-only. Settings contains optional password change using shared authentication; legacy staff activation flags do not block access. Student activation requirements are unchanged. Reset emails link to the staff subdomain; Resend configuration is still required for delivery.
- The shared responsive PortalShell provides desktop sidebar, mobile drawer, focus handling, Escape, skip navigation and white content surfaces.

Operational permissions for admissions, finance and content remain available through the shared API, but full staff-specific operational screens, courses, timetable, attendance, results, approval flows and messaging are **not implemented in this foundation**. Do not claim these services are ready just because a permission exists. The next stages connect these modules without duplicating backend logic.

## Deployment and portability

Apply `202611030016_staff_foundation`, generate Prisma Client, and deploy. Attach staff.uniquecollegekwali.com to the existing frontend Vercel project; in Namecheap add the CNAME Host `staff` with the exact target Vercel provides. Vercel/Neon remain replaceable: this is standard Express, React and PostgreSQL with ordinary relational tables. No new hosted identity service is required.

Configure API `CLIENT_URL` to include the staff origin if overriding defaults. This list is configuration-sensitive; changing source defaults alone does not alter an existing environment override. No live user is promoted, admitted, assigned or given new permissions by this migration. Never invent student credentials to bypass admission checks.

For student testing use `https://portal.uniquecollegekwali.com/` with an account already granted final admission. Its applicant email/password are preserved, with a required first student password change. Payment verification or application acceptance alone does not create student access.
