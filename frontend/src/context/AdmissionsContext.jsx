import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api/client.js";

const AdmissionsContext = createContext(null);

export function AdmissionsProvider({ children }) {
  const [policy, setPolicy] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);
  const { pathname } = useLocation();
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const response = await api.get("/settings/admissions");
      if (version === requestVersion.current) { setPolicy(response.data.data); setUnavailable(false); }
    } catch {
      if (version === requestVersion.current) { setPolicy(null); setUnavailable(true); }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    return () => { requestVersion.current += 1; };
  }, [pathname, refresh]);
  return <AdmissionsContext.Provider value={{ policy, unavailable, loading, refresh }}>{children}</AdmissionsContext.Provider>;
}

export function useAdmissions() {
  return useContext(AdmissionsContext);
}
