import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, apiErrorMessage } from "../api/client.js";
import { useProgressRefresh } from "../api/useProgressRefresh.js";
const StudentContext = createContext(null);
export function StudentProvider({ children }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const version = useRef(0);
  const pending = useRef(false);
  const refresh = useCallback(async ({ background = false } = {}) => {
    if (background && pending.current) return;
    const current = ++version.current;
    pending.current = true;
    if (!background) { setLoading(true); setError(""); }
    try { const { data } = await api.get("/student/me", { notifyOnError: !background }); if (version.current === current) setRecord(data.data); }
    catch (failure) { if (!background && version.current === current) { setRecord(null); setError(apiErrorMessage(failure, "Your student record could not be loaded.")); } }
    finally { if (version.current === current) { pending.current = false; if (!background) setLoading(false); } }
  }, []);
  useEffect(() => { refresh(); return () => { version.current++; }; }, [refresh]);
  useProgressRefresh(refresh, ["/", "/records", "/academic", "/student", "/student/records", "/student/academic"]);
  return <StudentContext.Provider value={{ record, loading, error, refresh }}>{children}</StudentContext.Provider>;
}
export const useStudent = () => useContext(StudentContext);
