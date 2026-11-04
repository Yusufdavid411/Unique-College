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
- Student Course catalogue requires the student's own confirmed academic
  assignment. Only published matching programme/session/level courses appear.
- Student dashboard lists academic confirmation, biodata/student record and
  guarantor-form progress and links to the next unfinished task. This is onboarding,
  not a claim that fee payment or course registration is completed.

Migrations 202611040018_academic_responsibilities and
202611040019_academic_course_index_name are additive and must be deployed
before the new frontend/API. Existing academic assignments are not changed.

## Next tranche: actual course registration

Add academic semesters, registration windows and institutional unit-load policy.
Do not invent minimum/maximum loads or treat admission fees as tuition payments.
Course registration needs a student/session/programme/level/semester scope,
versioned course-item snapshots, DRAFT → SUBMITTED → HOD_APPROVED (or RETURNED),
declaration, duplicate prevention and an approved printable course form.
HOD may approve only registrations in the appointed department. Preserve prior
sessions and course snapshots; progression never rewrites historical levels.

## Results tranche

Use versioned result batches with course registration and actual student identity:
HOD_DRAFT → SUBMITTED_TO_DEPARTMENT_EXAM_OFFICER →
SUBMITTED_TO_GENERAL_EXAM_OFFICER → PUBLISHED.
Record actor/timestamp at every transition. Return-to-sender needs a reason.
Grades remain invisible to students until publication. Published corrections
create an amendment rather than overwriting the original. Configure grade scales,
assessment weights and GPA rules before calculation. General-officer appointment
does not itself enable result access until these protected endpoints exist.

## CBT and other services

Plan restricted question banks, session/course exam eligibility, scheduled
start/end, server-controlled timing, resumable attempts, answer autosave,
accommodations and explicit result release. Never expose answer keys to browsers.
Timetables, fees, exam cards and hostel are separate modules; do not add empty
menu pages or claim these are operational.
