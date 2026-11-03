import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, apiErrorMessage } from "../api/client.js";

const ApplicantContext = createContext(null);

export function ApplicantProvider({ children }) {
  const [application, setApplication] = useState(null);
  const [formAccess, setFormAccess] = useState({ unlocked: false, amount: null });
  const [admission, setAdmission] = useState(null);
  const [screening, setScreening] = useState(null);
  const [journey, setJourney] = useState(null);
  const [paymentGateway, setPaymentGateway] = useState({ provider: "MANUAL", ready: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async ({ background = false } = {}) => {
    if (!background) setLoading(true);
    setError("");
    try {
      const response = await api.get("/applicant/dashboard");
      setApplication(response.data.data.application);
      setJourney(response.data.data.journey || null);
      setFormAccess(response.data.data.formAccess || { unlocked: false, amount: null });
      setAdmission(response.data.data.admission || null);
      setScreening(response.data.data.screening || null);
      setPaymentGateway(response.data.data.paymentGateway || { provider: "MANUAL", ready: false });
      return response.data.data;
    } catch (requestError) {
      if (background) return;
      setFormAccess({ unlocked: false, amount: null });
      setJourney(null);
      setError(apiErrorMessage(requestError, "Applicant information could not be loaded."));
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({ application, journey, formAccess, admission, screening, paymentGateway, loading, error, refresh, setApplication }), [application, journey, formAccess, admission, screening, paymentGateway, loading, error, refresh]);
  return <ApplicantContext.Provider value={value}>{children}</ApplicantContext.Provider>;
}

export function useApplicant() {
  return useContext(ApplicantContext);
}
