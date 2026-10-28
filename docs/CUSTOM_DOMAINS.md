# Custom domains

Current user-facing addresses are https://www.uniquecollegekwali.com,
https://apply.uniquecollegekwali.com and https://admin.uniquecollegekwali.com.
The shared live API is https://api.uniquecollegekwali.com. Do not publish temporary
Vercel deployment URLs as alternative portals. Old website aliases redirect to
the canonical domain; legacy portal paths redirect to the correct subdomain.
Payment sandbox testing was stopped at the user's request; do not resume or point
the public website at its test API. Retain test records separately for audit.

Namecheap retains DNS management. Existing public-domain records remain unchanged.
Add CNAME records named admin and apply using the exact target Vercel displays for
the uniquecollegekwali project. Add api using the target from unique-college-api.
Do not use @ for these subdomains or redirect them to the public website.

The frontend routes each portal directly at its hostname root. Admin / displays
login when signed out and the dashboard when signed in. Apply / displays account
registration (or the admissions-closed message) when signed out and the applicant
dashboard when signed in. Applicant sign-in is /login. Other pages use clean
paths such as admin /news or apply /payments. The public website keeps its own /news.
Host-specific Vercel redirects remove legacy /admin and /applicant prefixes,
including old login/register links; public/Vercel path-based routes still work.
Authentication scope is selected by the exact portal hostname, falling back to
path-based scope on local development and the original deployment address.
API endpoint paths and backend authorization are unchanged. Local storage is isolated by
origin, so users may need to sign in again on their new portal address.

All public application buttons (navbar, hero, admissions and programme cards) use
the shared portalLinks helpers. Public /apply, /application and legacy /applicant
addresses redirect to the single apply hostname; legacy admin paths redirect to
the admin hostname. Vercel handles public www redirects before rendering, while
App also canonicalizes client-side navigation and old Vercel deployment links.
Do not reintroduce raw applicant paths in public call-to-action buttons.
Public application calls to action use ApplyLink: a native anchor to the applicant
subdomain with target=_blank and rel=noopener noreferrer. They open a new tab and
remain visually static on hover, while retaining a visible keyboard focus outline.

Admissions availability is read from /api/settings/admissions, never inferred
from the domain or a build-time constant. The endpoint disables caching; the client
refreshes on route changes and when returning to the tab. Apply buttons remain
available when admissions close; the applicant portal shows the closure message
and news link instead of registration. API registration independently enforces the
live admissions policy. API failures must show unavailable, never assume open.

Production API CLIENT_URL must include the exact HTTPS origins for the public
apex, www, admin and apply, preserving existing allowed origins during migration.
Do not allow wildcard origins. Defaults apply only when CLIENT_URL is unset.
Set API PUBLIC_BASE_URL=https://api.uniquecollegekwali.com and frontend
VITE_API_URL=https://api.uniquecollegekwali.com, then redeploy both projects.
No database migration, new signing secret, password or account email is required.

Verify HTTPS, /api/health and /api/health/db on the API domain; CORS preflight for
each frontend origin; portal root redirects and deep links; login and authorized
downloads. API / returns 404 by design; use the health endpoints instead.

Staff and student portal domains are reserved architectural names only until
Stages 3 and 4 are implemented. Do not describe these portals as available.
