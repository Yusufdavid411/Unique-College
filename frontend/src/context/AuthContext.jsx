import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api/client.js";
import { clearSession, saveSession, scopeForUser, sessionKey, sessionScope, sessionToken } from "../api/session.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { pathname } = useLocation();
  const scope = sessionScope(pathname);
  const [session, setSession] = useState({ scope, user: null, loading: true });
  const intent = useRef(0);

  useEffect(() => {
    let version = 0;
    let active = true;
    async function sync() {
      const current = ++version;
      const requestIntent = intent.current;
      const token = sessionToken(scope);
      setSession({ scope, user: null, loading: Boolean(token) });
      if (!token) return;
      try {
        const response = await api.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        if (!active || current !== version || requestIntent !== intent.current) return;
        const user = response.data.data.user;
        const verifiedScope = scopeForUser(user);
        const allowed = verifiedScope === scope || (scope === "applicant" && user.role === "STUDENT");
        if (allowed) saveSession(scope, token);
        setSession({ scope, user: allowed ? user : null, loading: false });
      } catch (error) {
        if (!active || current !== version || requestIntent !== intent.current) return;
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
    intent.current++;
    const response = await api.post("/auth/login", { email, password });
    saveSession("admin", response.data.data.token);
    setSession({ scope: "admin", user: response.data.data.user, loading: false });
  }

  async function applicantLogin(identifier, password) {
    intent.current++;
    const response = await api.post("/auth/applicant/login", { identifier, password });
    saveSession("applicant", response.data.data.token);
    setSession({ scope: "applicant", user: response.data.data.user, loading: false });
  }

  async function registerApplicant(payload) {
    intent.current++;
    const response = await api.post("/applicant/register", payload);
    saveSession("applicant", response.data.data.token);
    setSession({ scope: "applicant", user: response.data.data.user, loading: false });
  }

  async function studentLogin(identifier, password) {
    intent.current++;
    const response = await api.post("/auth/student/login", { identifier, password });
    saveSession("student", response.data.data.token);
    setSession({ scope: "student", user: response.data.data.user, loading: false });
  }

  async function staffLogin(email, password) {
    intent.current++;
    const response = await api.post("/auth/staff/login", { email, password });
    saveSession("staff", response.data.data.token);
    setSession({ scope: "staff", user: response.data.data.user, loading: false });
  }

  const completeStudentHandoff = useCallback(async (code) => {
    intent.current++;
    const response = await api.post("/auth/student/handoff/redeem", { code }, { withCredentials: true });
    saveSession("student", response.data.data.token);
    setSession({ scope: "student", user: response.data.data.user, loading: false });
  }, []);

  function logout() {
    intent.current++;
    clearSession(scope);
    setSession({ scope, user: null, loading: false });
  }

  const value = { user: session.scope === scope ? session.user : null, loading: session.scope !== scope || session.loading, login, applicantLogin, studentLogin, staffLogin, completeStudentHandoff, registerApplicant, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
