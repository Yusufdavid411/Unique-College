const publicHosts = new Set(["uniquecollegekwali.com", "www.uniquecollegekwali.com"]);

export function shouldTrackWebsiteVisit(location, navigator) {
  return publicHosts.has(location.hostname) && navigator.doNotTrack !== "1" && navigator.globalPrivacyControl !== true;
}

export function publicReferrer(referrer) {
  try { return new URL(referrer).origin; } catch { return ""; }
}

export function sendWebsitePageView({ apiBase, path, browser = globalThis.window, navigator = globalThis.navigator, document = globalThis.document, request = globalThis.fetch }) {
  if (!browser || !navigator || !document || !shouldTrackWebsiteVisit(browser.location, navigator)) return;
  if (!browser.crypto?.randomUUID) return;
  const id = browser.crypto.randomUUID();
  const body = JSON.stringify({ id, path, referrer: publicReferrer(document.referrer) });
  try {
    Promise.resolve(request(`${apiBase.replace(/\/$/, "")}/api/analytics/pageviews`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body,
      credentials: "omit", referrerPolicy: "no-referrer", keepalive: true,
      ...(globalThis.AbortSignal?.timeout ? { signal: AbortSignal.timeout(5000) } : {})
    })).catch(() => {});
  } catch {}
}
