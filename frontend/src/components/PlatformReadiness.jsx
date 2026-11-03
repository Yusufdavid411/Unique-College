import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, RefreshCw, Settings2 } from "lucide-react";
import { api, apiErrorMessage } from "../api/client.js";
import { ErrorToast } from "./ToastNotifications.jsx";

export default function PlatformReadiness() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api.get("/settings/readiness", { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setReport(data.data);
    }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  const incomplete = report?.checks.filter((check) => check.status === "ACTION_REQUIRED").length || 0;
  function openLetterSettings() {
    const panel = document.getElementById("admission-document-settings");
    const letters = document.getElementById("admission-letter-settings");
    if (!panel || !letters) return;
    panel.open = true;
    letters.open = true;
    letters.querySelector("summary")?.focus();
    letters.scrollIntoView({ block: "start", behavior: "auto" });
  }
  return <section className="form-panel readiness-panel" aria-labelledby="readiness-title" aria-busy={loading}>
    <div className="readiness-heading"><div><span className="eyebrow">Activation checklist</span><h2 id="readiness-title">Platform setup</h2></div><button type="button" className="button secondary" disabled={loading} onClick={() => setRevision((value) => value + 1)}><RefreshCw size={16} aria-hidden="true" />{loading ? "Checking…" : "Refresh checks"}</button></div>
    <ErrorToast message={error} />
    {!report ? <p role="status">{error ? "Setup checks could not load. Use Refresh checks to retry." : "Checking configuration and database connectivity…"}</p> : <>
      <p role="status">{incomplete ? `${incomplete} item${incomplete === 1 ? " needs" : "s need"} attention before live admissions.` : "Configuration checks complete. Verify external accounts and perform the school's final activation review."}</p>
      <div className="readiness-list">{report.checks.map((check) => <details key={check.id} className={`readiness-item ${check.status === "ACTION_REQUIRED" ? "needs-attention" : ""}`}><summary>{check.status === "ACTION_REQUIRED" ? <CircleAlert size={20} aria-hidden="true" /> : check.status === "READY" ? <CheckCircle2 size={20} aria-hidden="true" /> : <Settings2 size={20} aria-hidden="true" />}<span>{check.title}</span><small>{check.status === "READY" ? "Checked" : check.status === "CONFIGURED" ? "Configured" : "Action required"}</small></summary><div><p>{check.message}</p>{check.action && <p>{check.action}</p>}{check.id === "letters" && <button type="button" className="button secondary" onClick={openLetterSettings}>Set official letter details</button>}</div></details>)}</div>
      <p className="readiness-caption">Checked {new Date(report.checkedAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })} WAT. {report.note}</p>
    </>}
  </section>;
}
