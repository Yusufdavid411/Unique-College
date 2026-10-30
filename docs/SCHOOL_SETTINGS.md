# Editable school information

Admin Settings now has labelled, collapsible School identity, Contact details and Website
information editors. Each section has its own save action. Unpublished edits in other
sections are preserved when saving a section. The raw Key/Value/Group editor and duplicate
read-only setting cards are not part of the normal administration UI.

GET /api/settings/school publishes only an explicit whitelist of school presentation fields.
PATCH /api/settings/school requires settings.manage, validates the entire submitted section,
and saves changes and audit history in one transaction. Unknown keys and service configuration
are rejected; no secrets or internal settings are included in the public profile.

The public header/footer, home, about, admissions and contact pages read these settings through
SchoolContext, with existing site data as a fallback. The applicant session label, portal brand,
page titles and HTML admission header also use the profile. Updates appear immediately in the
saving portal and are refreshed when another open website window regains focus or reloads.

The website-domain field is presentation/contact information. It does not change DNS, API
origins, portal routing, merchant accounts or email hosting. The approval statement remains
school-supplied text; changing it does not grant accreditation. Separately edited descriptive
copy should be kept consistent with legal/contact details by the authorised school editor.

The original school-supplied PDF template is intentionally unchanged, preserving its approved
letterhead and layout. Changing that official template requires a separately approved document.

Admissions controls retain open/closed, public message and application form price. A quoted
price remains attached to existing applicants. Bank instructions are no longer required,
published, or saved in the admissions policy. The applicant payment screen uses the online
gateway only, while historic payments and downloadable receipts remain preserved.

Settings seeding creates missing defaults without replacing existing edited values. No new
database tables or schema migration are required for these editors.
