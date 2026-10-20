# Application and receipt downloads

Applicant Print centre and the administrator's application review use the same
ApplicationDownloads component and authenticated API endpoints. These buttons
download actual PDF files, rather than opening browser Print for an HTML page.
Open the downloaded PDF to print the original layout without website navigation,
browser URL headers, or payment tables appended to the form.

## Authoritative school template

`backend/assets/admission-form.pdf` is the unchanged two-page PDF supplied by the
school as `APPLICATION FORM FOR ADMISSION_UCHK 1.pdf`.
SHA-256: `25b4f643622852d4dd752c706beee5f9e2b48e8be5af1cc337923167a36971eb`.

Form generation overlays applicant values on the original pages. The logo,
letterhead, address, contact details, watermark, section wording, tables and page
dimensions remain those of the supplied document, not a rebuilt HTML design.
Signature areas remain blank for signing; no signature is fabricated. A programme
name is filled in the blank space below the course list to preserve exact current
programme names without replacing the original printed options. Exam year is
included alongside exam body. Unsupported characters or entries too long for the
printed spaces return a readable 422 response instead of being silently cropped.

DejaVu Sans is embedded as a subset for entered Unicode text; its redistribution
license accompanies the font. Both assets ship with the portable Node API and
require no browser automation service, external PDF service or database change.

## Separate records and access

- `GET /api/records/applications/:id/form` returns only the two-page application.
  The owning applicant needs verified form access; staff need applications.read.
- `GET /api/records/applications/:id/payments/:paymentId/receipt` returns one
  separate payment receipt, using the original school letterhead. Only VERIFIED
  records qualify. Pending/rejected evidence is not described as a paid receipt.
  Access requires ownership, applications.read or payments.verify. The payment
  must belong to the requested application.
- Original bank receipt uploads remain separate private evidence downloads through
  `/api/files`; they are not appended to either generated PDF.
- All generated downloads require a current authenticated session, use attachment
  responses and private/no-store cache policy, and return 404 for unauthorised
  access to another applicant's records.

Admin/applicant equality, access isolation, payment gating, page counts, Unicode
names and overlong-field handling are covered by record-downloads.test.js. Filled
fictional forms and a receipt were rendered locally to inspect alignment against
both pages of the source template. The retained admission notice is a separate
existing feature and is not the school application form or a payment receipt.
