# Custom domains

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
