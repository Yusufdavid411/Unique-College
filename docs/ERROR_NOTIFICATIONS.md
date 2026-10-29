# Shared error notifications

ToastNotifications is mounted outside the application error boundary so it remains visible
when the main React tree needs its recovery screen. Axios failures are reported through one
response interceptor, covering all portals, public API requests, uploads and downloads.
Existing auth, retries, timeouts and payment verification are unchanged.

Messages distinguish an offline browser, a timeout, an unreachable server, rejected login,
expired session, permission failures, validation, oversized files, throttling and service
outages. A generic network failure does not identify whether DNS, CORS, a server outage or
an unstable connection caused it; the UI does not invent an exact diagnosis. Raw internal
server errors and unexpected exception messages are not displayed to users.

Duplicate messages are suppressed, cancelled requests are silent, and at most three toasts
are visible. Notifications are keyboard dismissible, announced by assistive technology and
pause their ten-second dismissal timer on hover or focus. Offline/online events, native
form validation, uncaught runtime errors, rejected promises and React boundary failures
are also covered after the application starts. Failure of the initial JavaScript bundle,
browser-level errors and a completely unreachable website still require the startup/browser
recovery experience; no JavaScript toast can run before JavaScript loads.

Login, common admin notices, applicant forms, payments, password changes and downloads use
shared toasts instead of red error paragraphs. Useful neutral recovery states and field-level
validation remain where they explain how to continue. Success feedback remains unchanged.

Use notify({title,message}) for deliberate client-side errors, reportApiError(error) for
caught API exceptions, and reportUnexpectedError(error) for unexpected exceptions. The API
interceptor already handles ordinary API errors, so callers do not need duplicate alerts.
Use notifyOnError:false only for deliberately silent API work; visitor collection already
uses a separate best-effort, credential-free fetch and never interrupts public browsing.

Payment timeout/outage messages explicitly warn against paying again. A toast never retries
payments or marks a transaction successful. Files with small JSON error bodies are decoded
before reporting the failure so download errors use the same messages.
