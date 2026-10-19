import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api/client.js";
import { clearSession, saveSession, scopeForUser, sessionKey, sessionScope, sessionToken } from "../api/session.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { pathname } = useLocation();
  const scope = sessionScope(pathname);
  const [session, setSession] = useState({ scope, user: null, loading: true });

  useEffect(() => {
    let version = 0;
    let active = true;
    async function sync() {
      const current = ++version;
      const token = sessionToken(scope);
      setSession({ scope, user: null, loading: Boolean(token) });
      if (!token) return;
      try {
        const response = await api.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        if (!active || current !== version) return;
        const user = response.data.data.user;
        const verifiedScope = scopeForUser(user);
        if (verifiedScope) saveSession(verifiedScope, token);
        setSession({ scope, user: verifiedScope === scope ? user : null, loading: false });
      } catch (error) {
        if (!active || current !== version) return;
        if ([401, 403].includes(error.response?.status)) clearSession(scope);
        setSession({ scope, user: null, loading: false });
      }
    }
    const onStorage = (event) => {
      if (event.key === sessionKey(scope) || event.key === "unique_college_token" || event.key === null) sync();
    };
    sync();
    window.addEventListener("storage", onStorage);
    return () => { active = false; window.removeEventListener("storage", onStorage); };
  }, [scope]);

  async function login(email, password) {
    const response = await api.post("/auth/login", { email, password });
    saveSession("admin", response.data.data.token);
    setSession({ scope: "admin", user: response.data.data.user, loading: false });
  }

  async function applicantLogin(identifier, password) {
    const response = await api.post("/auth/applicant/login", { identifier, password });
    saveSession("applicant", response.data.data.token);
    setSession({ scope: "applicant", user: response.data.data.user, loading: false });
  }

  async function registerApplicant(payload) {
    const response = await api.post("/applicant/register", payload);
    saveSession("applicant", response.data.data.token);
    setSession({ scope: "applicant", user: response.data.data.user, loading: false });
  }

  function logout() {
    clearSession(scope);
    setSession({ scope, user: null, loading: false });
  }

  const value = { user: session.scope === scope ? session.user : null, loading: session.scope !== scope || session.loading, login, applicantLogin, registerApplicant, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
