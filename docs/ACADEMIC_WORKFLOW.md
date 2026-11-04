# Academic platform direction

## Source of institutional policy

The CEO's requested result workflow is the authority for Unique College:
HOD → departmental examination officer → general examination officer → published
student results. Other institutions are references, not replacements for this
approval chain. The existing React/Express/Prisma/PostgreSQL platform remains.

References reviewed:

- [University of Ibadan course-registration guide](https://ui.edu.ng/sites/default/files/guideline%20for%20the%202025_2026%20academic%20session_0.pdf):
  course selection, submission, units and a separate coordinator approval.
- [Federal University Lokoja departmental handbook](https://www.fulokoja.edu.ng/assets/departments/handbook/arts-and-social-science-education_Hand_Book_30.pdf):
  examination-officer collation and layered examination-board consideration.
- [University of Ilorin examination guidance](https://che.engineering.unilorin.edu.ng/wp-content/uploads/2025/03/CHE-SSR_2024.pdf):
  results pass through approval stages before publication in student portals.

The supplied screenshots guide session/level selection, semester separation,
registration progress and downloadable records, not the visual design. No public
student-name/photo lookup is added to login: identity stays private until sign-in.

## Implemented first tranche

- Admin creates staff using existing staff accounts and assigns HOD, departmental
  examination officer or general examination officer in Academic setup.
- One active HOD and one active departmental examination officer per department;
  one active general examination officer school-wide. End an appointment before
  replacing it. Prior appointments and audit records are retained.
- An appointment does not grant global user, finance or academic-management
  permission. Current active HOD appointment controls department-course writing
  on the backend, regardless of which buttons the frontend shows.
- HOD creates draft course code/title/credit units/core-or-elective entries for
  a specific programme, academic session, level and semester, then publishes them.
- Student course registration requires the student's own confirmed academic
  assignment. Only published matching programme/session/level courses appear.
- Student dashboard lists academic confirmation, biodata/student record and
  guarantor-form progress and links to the next unfinished task. This is onboarding,
  not a claim that fee payment or course registration is completed.

Migrations 202611040018_academic_responsibilities and
202611040019_academic_course_index_name are additive and must be deployed
before the new frontend/API. Existing academic assignments are not changed.

## Course registration

Implemented per programme/session/level and first/second semester. HOD or admin
configures opening/closing times and minimum/maximum units; no values are guessed.
All published core courses must be selected, electives are optional within limits.
The student's confirmed enrolment determines ownership and programme.
Submission captures immutable code/title/unit snapshots and waits for HOD review.
SUBMITTED → APPROVED or RETURNED with a required correction reason. Returned
registrations can be corrected within the open window. Approved registrations
have a private downloadable course form. Duplicate submissions and stale
versions are rejected. Approved registrations cannot be silently overwritten.
Admission payments are not tuition payments; tuition billing/payment eligibility
is not inferred by this module.

## Results

Implemented one batch per course: DRAFT → DEPARTMENT_REVIEW → GENERAL_REVIEW →
PUBLISHED. HOD enters one score out of 100 per approved registered student;
departmental exam officer forwards; general exam officer publishes. Admin may
perform every stage. Officers may return unpublished batches to the HOD with a
required reason. Every transition has actor, timestamp and history. Students
see only their own published entries. No grades/GPA are invented: grading scales
and assessment weights require school policy. Published batches are locked;
a future formal amendment workflow is required to correct them.

## CBT

Implemented per-course draft examinations with multiple-choice questions, answer
keys restricted to the database, a scheduled window and duration in minutes.
HOD/admin saves draft and publishes, cancels only before any attempts exist, and
releases scores only after the exam closes. Approved course registration is
required. Students receive questions only after starting within the scheduled
window. One resumable attempt is allowed per student/course examination.
Deadline is server-controlled and survives refresh; answers autosave with
optimistic version checking; late answers are ignored and saved answers are
graded server-side. Submissions are immutable and scores stay hidden until
explicit release. CBT does not bypass the official academic result chain.
This is not a remote-proctoring system. Individual accommodations and item-bank
imports remain future enhancements.

## Setup and release

Apply migration 202611040020_academic_registration_results_cbt before deploying
the API/frontend. Run the isolated integration test against a database whose
name contains test. Never run fixtures against the school's live database.
Configure academic assignments, HOD/officer appointments, published courses and
registration windows before inviting students to register. Configure actual
exam dates/questions before publishing a CBT.

School-fee invoicing, attendance, GPA/CGPA, transcript/graduation requests,
teaching timetables, hostel and formal published-result amendments remain outside
this release. No placeholder links or invented payments are used for them.
