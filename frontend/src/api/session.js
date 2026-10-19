const legacyKey = "unique_college_token";

export function sessionScope(pathname) {
  if (/^\/admin(?:\/|$)/.test(pathname)) return "admin";
  if (/^\/applicant(?:\/|$)/.test(pathname)) return "applicant";
  return null;
}

export function sessionKey(scope) {
  return scope ? `unique_college_${scope}_token` : null;
}

export function sessionToken(scope, storage = localStorage) {
  return scope ? storage.getItem(sessionKey(scope)) || storage.getItem(legacyKey) : null;
}

export function saveSession(scope, token, storage = localStorage) {
  storage.setItem(sessionKey(scope), token);
  if (storage.getItem(legacyKey) === token) storage.removeItem(legacyKey);
}

export function clearSession(scope, storage = localStorage) {
  if (!scope) return;
  storage.removeItem(legacyKey);
  storage.removeItem(sessionKey(scope));
}

export function scopeForUser(user) {
  return user?.role === "ADMIN" ? "admin" : ["APPLICANT", "STUDENT"].includes(user?.role) ? "applicant" : null;
}
