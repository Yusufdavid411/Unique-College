# Page loading and document presentation

Portal routes share lazy-loaded frontend page files. An open tab can still
reference an older file after a deployment, or a file download may fail during
a connection interruption. Vite preload failures and React chunk-load failures
are recovered by refreshing the current URL once per minute at most. Session
tokens and saved records are not cleared. Ordinary rendering/API errors do not
trigger automatic refreshes. Offline users or blocked session storage receive a
retry screen instead of an automatic reload loop.

Frontend responses revalidate their cache entries. The recovery screen has a
white background, readable text and a dashboard link appropriate to the current
portal. This recovery path does not retry payments or form submissions.

API responses are private and non-cacheable and vary by Origin and Authorization.
The login-check URL is portal-scoped to avoid reusing an older cached response
with another portal's CORS header when switching between subdomains.

ApplicationDownloads is shared by admin, applicant and student portals. Only its
three section headings have divider rules; document rows and document controls
have no underline. Supporting student document rows also have no divider.
Original PDF templates, table rules inside generated forms and card outlines are
unchanged.
