import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, apiErrorMessage } from "../api/client.js";
const StudentContext = createContext(null);
export function StudentProvider({ children }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++version.current;
    setLoading(true); setError("");
    try { const { data } = await api.get("/student/me"); if (version.current === current) setRecord(data.data); }
    catch (failure) { if (version.current === current) { setRecord(null); setError(apiErrorMessage(failure, "Your student record could not be loaded.")); } }
    finally { if (version.current === current) setLoading(false); }
  }, []);
  useEffect(() => { refresh(); return () => { version.current++; }; }, [refresh]);
  return <StudentContext.Provider value={{ record, loading, error, refresh }}>{children}</StudentContext.Provider>;
}
export const useStudent = () => useContext(StudentContext);
