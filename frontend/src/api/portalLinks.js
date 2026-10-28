const schoolHosts = new Set([
  "uniquecollegekwali.com",
  "www.uniquecollegekwali.com",
  "admin.uniquecollegekwali.com",
  "apply.uniquecollegekwali.com"
]);

export function portalScope(hostname = globalThis.location?.hostname) {
  if (hostname === "admin.uniquecollegekwali.com") return "admin";
  if (hostname === "apply.uniquecollegekwali.com") return "applicant";
  return null;
}

export function portalPath(path, hostname = globalThis.location?.hostname) {
  const scope = portalScope(hostname);
  if (!scope || !new RegExp(`^/${scope}(?:/|$)`).test(path)) return path;
  const cleanPath = path.slice(scope.length + 1) || "/";
  if (scope === "admin" && cleanPath === "/login") return "/";
  if (scope === "applicant" && cleanPath === "/register") return "/";
  return cleanPath;
}

export function publicPageHref(path, hostname) {
  return schoolHosts.has(hostname) ? `https://www.uniquecollegekwali.com${path}` : path;
}

export function applicationHref(hostname) {
  return schoolHosts.has(hostname) ? "https://apply.uniquecollegekwali.com/" : "/applicant/register";
}
