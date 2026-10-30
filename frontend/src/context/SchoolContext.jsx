import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client.js";
import { schoolInfoFromSettings } from "../data/schoolSettings.js";

const SchoolContext = createContext({ schoolInfo: schoolInfoFromSettings(), updateSchoolSettings: () => {} });

export function SchoolProvider({ children }) {
  const [values, setValues] = useState({});
  const requestVersion = useRef(0);
  const updateSchoolSettings = useCallback((profile) => { requestVersion.current += 1; setValues(profile); }, []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function refresh() {
      const request = ++requestVersion.current;
      try {
        const response = await api.get("/settings/school", { signal: controller.signal });
        if (active && request === requestVersion.current) setValues(response.data.data);
      } catch {}
    }
    refresh();
    window.addEventListener("focus", refresh);
    return () => { active = false; controller.abort(); window.removeEventListener("focus", refresh); };
  }, []);
  const context = useMemo(() => ({ schoolInfo: schoolInfoFromSettings(values), updateSchoolSettings }), [values, updateSchoolSettings]);
  return <SchoolContext.Provider value={context}>{children}</SchoolContext.Provider>;
}

export const useSchool = () => useContext(SchoolContext);
