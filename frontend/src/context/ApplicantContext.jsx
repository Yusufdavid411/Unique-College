import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, apiErrorMessage } from "../api/client.js";

const ApplicantContext = createContext(null);

export function ApplicantProvider({ children }) {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/applicant/dashboard");
      setApplication(response.data.data.application);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Applicant information could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({ application, loading, error, refresh, setApplication }), [application, loading, error, refresh]);
  return <ApplicantContext.Provider value={value}>{children}</ApplicantContext.Provider>;
}

export function useApplicant() {
  return useContext(ApplicantContext);
}
