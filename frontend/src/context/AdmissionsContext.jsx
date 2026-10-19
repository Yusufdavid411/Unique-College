import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api/client.js";

const AdmissionsContext = createContext(null);

export function AdmissionsProvider({ children }) {
  const [policy, setPolicy] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    let current = true;
    api.get("/settings/admissions").then((response) => {
      if (current) { setPolicy(response.data.data); setUnavailable(false); }
    }).catch(() => { if (current) { setPolicy(null); setUnavailable(true); } });
    return () => { current = false; };
  }, [pathname]);
  return <AdmissionsContext.Provider value={{ policy, unavailable }}>{children}</AdmissionsContext.Provider>;
}

export function useAdmissions() {
  return useContext(AdmissionsContext);
}
