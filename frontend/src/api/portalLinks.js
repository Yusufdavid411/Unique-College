const schoolHosts = new Set([
  "uniquecollegekwali.com",
  "www.uniquecollegekwali.com",
  "admin.uniquecollegekwali.com",
  "staff.uniquecollegekwali.com",
  "apply.uniquecollegekwali.com",
  "portal.uniquecollegekwali.com",
  "uniquecollegekwali.vercel.app",
  "uniquecollegekwali-yusufdavid411s-projects.vercel.app"
]);
const retiredPaymentTestHost = "unique-college-payment-test.vercel.app";
const legacyWebsiteHosts = new Set([
  "uniquecollegekwali.vercel.app",
  "uniquecollegekwali-yusufdavid411s-projects.vercel.app"
]);

export function retiredPaymentSandbox(hostname = globalThis.location?.hostname) {
  return hostname === retiredPaymentTestHost;
}

export function portalScope(hostname = globalThis.location?.hostname) {
  if (hostname === "staff.uniquecollegekwali.com") return "staff";
  if (hostname === "admin.uniquecollegekwali.com") return "admin";
  if (hostname === "apply.uniquecollegekwali.com") return "applicant";
  if (hostname === "portal.uniquecollegekwali.com") return "student";
  return null;
}

export function portalPath(path, hostname = globalThis.location?.hostname) {
  const scope = portalScope(hostname);
  if (!scope || !new RegExp(`^/${scope}(?:/|$)`).test(path)) return path;
  const cleanPath = path.slice(scope.length + 1) || "/";
  if (scope === "admin" && cleanPath === "/login") return "/";
  if (scope === "staff" && cleanPath === "/login") return "/";
  if (scope === "student" && cleanPath === "/login") return "/";
  if (scope === "applicant" && cleanPath === "/register") return "/";
  return cleanPath;
}

export function publicPageHref(path, hostname) {
  return schoolHosts.has(hostname) || retiredPaymentSandbox(hostname) ? `https://www.uniquecollegekwali.com${path}` : path;
}

export function applicationHref(hostname = globalThis.location?.hostname) {
  if (retiredPaymentSandbox(hostname)) return "https://apply.uniquecollegekwali.com/";
  return schoolHosts.has(hostname) ? "https://apply.uniquecollegekwali.com/" : "/applicant/register";
}

export function applicantLoginHref(hostname = globalThis.location?.hostname) {
  if (retiredPaymentSandbox(hostname)) return "https://apply.uniquecollegekwali.com/login";
  return schoolHosts.has(hostname) ? "https://apply.uniquecollegekwali.com/login" : "/applicant/login";
}

export function studentPortalHref(hostname = globalThis.location?.hostname) {
  return schoolHosts.has(hostname) ? "https://portal.uniquecollegekwali.com/" : "/student";
}

export function canonicalPortalHref(pathname, hostname = globalThis.location?.hostname) {
  if (retiredPaymentSandbox(hostname)) return "https://apply.uniquecollegekwali.com/";
  if (!schoolHosts.has(hostname) || portalScope(hostname)) return null;
  if (/^\/(apply|application)\/?$/.test(pathname)) return applicationHref(hostname);
  if (/^\/applicant(?:\/|$)/.test(pathname)) {
    return `https://apply.uniquecollegekwali.com${portalPath(pathname, "apply.uniquecollegekwali.com")}`;
  }
  if (/^\/admin(?:\/|$)/.test(pathname)) {
    return `https://admin.uniquecollegekwali.com${portalPath(pathname, "admin.uniquecollegekwali.com")}`;
  }
  if (/^\/staff(?:\/|$)/.test(pathname)) return `https://staff.uniquecollegekwali.com${portalPath(pathname, "staff.uniquecollegekwali.com")}`;
  if (/^\/student(?:\/|$)/.test(pathname)) return `https://portal.uniquecollegekwali.com${portalPath(pathname, "portal.uniquecollegekwali.com")}`;
  return legacyWebsiteHosts.has(hostname) ? `https://www.uniquecollegekwali.com${pathname}` : null;
}
