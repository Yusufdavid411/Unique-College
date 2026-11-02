import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client.js";
import { notify } from "../api/notifications.js";
import { ErrorToast } from "./ToastNotifications.jsx";
import PrivateFileButton from "./PrivateFileButton.jsx";
const titles = { ACCEPTANCE: "Acceptance form", GUARANTOR: "Guarantor’s form", STUDENT_RECORD: "Student record form" };
export default function SchoolFormEditor() {
  const { kind } = useParams();
  const [result, setResult] = useState(null);
  const [values, setValues] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { const controller = new AbortController(); setResult(null); setError(""); api.get(`/school-forms/${kind}`, { signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) { setResult(data.data); setValues(data.data.record?.data || data.data.defaults || {}); } }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); }); return () => controller.abort(); }, [kind, revision]);
  async function save(event) {
    event.preventDefault(); if (busy) return;
    const submit = event.nativeEvent.submitter?.value === "submit";
    if (submit && !window.confirm("Submit these details for the school's record? Submitted entries cannot be edited without the registry's correction process.")) return;
    setBusy(true); setError("");
    try { const { data } = await api.put(`/school-forms/${kind}`, { data: values, submit, version: result.record?.updatedAt || null }); setResult({ ...result, record: data.data }); notify({ title: submit ? "Form submitted" : "Draft saved", message: data.message, type: "info" }); }
    catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <div className="portal-page"><header className="portal-page-header"><div><span className="eyebrow">School documents</span><h1>{titles[kind] || "School form"}</h1><p>Complete the details online. Your download uses the school’s original page, not a redesigned document.</p></div></header><ErrorToast message={error} />{!result ? <section className="student-card"><p>{error ? "This form is not available yet." : "Loading form…"}</p>{error && <button className="button" type="button" onClick={() => setRevision((value) => value + 1)}>Try again</button>}</section> : result.record?.status === "SUBMITTED" ? <section className="student-card"><h2>Form submitted</h2><p>Download your completed copy. Signature lines remain blank for the actual student, guarantor and witness to sign where required. No signature is created on anyone’s behalf.</p><PrivateFileButton endpoint={`/records/applications/${result.applicationId}/documents/${kind}`} filename={`${kind.toLowerCase()}.pdf`}>Download completed school form</PrivateFileButton></section> : <form className="student-card student-form" onSubmit={save}><details><summary>Before you complete this form</summary><p>Enter only accurate information. Do not sign on behalf of a guarantor or witness. The school may require the printed original with handwritten signatures.</p></details><div className="student-field-grid">{result.fields.map(([key, label, required, type]) => type === "checkbox" ? <label className="check-field" key={key}><input type="checkbox" checked={Boolean(values[key])} disabled={busy} onChange={(event) => setValues({ ...values, [key]: event.target.checked })} />{label}</label> : <label key={key}>{label}{required ? " *" : ""}<input type={type === "email" ? "email" : "text"} value={values[key] || ""} maxLength={key.toLowerCase().includes("address") ? 300 : 100} disabled={busy} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></label>)}</div><div className="portal-form-actions"><button className="button secondary" type="submit" value="draft" disabled={busy}>Save draft</button><button className="button" type="submit" value="submit" disabled={busy}>{busy ? "Saving…" : "Submit form"}</button></div></form>}</div>;
}
