# Admission letter setup

The first page of the school-supplied document pack is the provisional admission
letter. The second page is the fee appendix. After release, the letter is
available in the applicant Print centre and student Documents & receipts.

## Calendar reference — not Unique College policy

The Federal University of Agriculture and Development Studies, Iragbiji,
[published its 2026/2027 calendar](https://www.fuadsi.edu.ng/news-events/news/approved-academic-calendar-for-the-2026-2027-academic-session.html).
It lists 2 November 2026 as the start of the session and fresh-student registration,
15 December 2026 as the end of fresh-student registration, 9 November 2026 as the
general lecture start, and 16 December 2026 for its fresh-student commencement
lecture and matriculation. These are reference dates, not dates to print on a
Unique College letter without approval. The calendar does not establish Unique
College programme lengths, O-level deadlines or fees.

The registrar should confirm those items, the applicable start and deadline dates,
and the fee appendix in Settings before issuing official letters.

## Final admission

Final admission now generates or reuses the admission letter inside the same
database transaction as the student-role transition. Missing or invalid letter
settings roll back the transition. The dashboard links directly to the missing
settings instead of leaving the admin to discover a separate release task.

The document-review panel offers a single audited confirmation for all current
files the admin has reviewed. Changed file versions require a fresh review.
Group notifications never verify documents or payments.

The [Federal School of Surveying's admissions guide](https://www.fss-oyo.edu.ng/DOCUMENTS/Step-by-Step%20Guide%20for%20Newly%20Admitted%20Students.pdf)
separates submission of clearance documents, staff verification and access to
student records. In Unique College, the separate bulk final-admission action is
limited to applications already cleared for admission. It does not verify
documents or payments and does not replace the status checks for each applicant.
