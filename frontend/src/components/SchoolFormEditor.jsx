import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client.js";
import { notify } from "../api/notifications.js";
import { ErrorToast } from "./ToastNotifications.jsx";
import PrivateFileButton from "./PrivateFileButton.jsx";
import { useConfirmation } from "../context/ConfirmationContext.jsx";
import { useApplicant } from "../context/ApplicantContext.jsx";
import { portalPath } from "../api/portalLinks.js";
const titles = { ACCEPTANCE: "Acceptance form", GUARANTOR: "Guarantor’s form", STUDENT_RECORD: "Student record form" };
export default function SchoolFormEditor() {
  const confirmAction = useConfirmation();
  const { kind } = useParams();
  const applicant = useApplicant();
  const dashboardPath = portalPath(applicant ? "/applicant" : "/student");
  const [result, setResult] = useState(null);
  const [values, setValues] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { const controller = new AbortController(); setResult(null); setError(""); api.get(`/school-forms/${kind}`, { signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) { setResult(data.data); setValues({ ...data.data.defaults, ...data.data.record?.data }); } }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); }); return () => controller.abort(); }, [kind, revision]);
  async function save(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      if (!await confirmAction({ title: "Submit your school form?", message: "Check your entries before submitting. Later changes require the registry's correction process.", confirmLabel: "Submit form", cancelLabel: "Keep editing" })) return;
      const { data } = await api.put(`/school-forms/${kind}`, { data: values, submit: true, version: result.record?.updatedAt || null });
      setResult({ ...result, record: data.data });
      notify({ title: "Form submitted", message: data.message, type: "info" });
    }
    catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <div className="portal-page"><header className="portal-page-header"><div><span className="eyebrow">School documents</span><h1>{titles[kind] || "School form"}</h1></div></header><ErrorToast message={error} />{!result ? <section className="student-card"><p>{error ? "This form is not available yet." : "Loading form…"}</p>{error && <button className="button" type="button" onClick={() => setRevision((value) => value + 1)}>Try again</button>}</section> : result.record?.status === "SUBMITTED" ? <section className="student-card"><h2>Form submitted</h2><p>Download and sign where indicated.</p><div className="school-form-completion-actions"><PrivateFileButton endpoint={`/records/applications/${result.applicationId}/documents/${kind}`} filename={`${kind.toLowerCase()}.pdf`}>Download {kind === "ACCEPTANCE" ? "acceptance form" : "completed form"} (PDF)</PrivateFileButton>{kind === "ACCEPTANCE" && <Link className="button primary" to={dashboardPath} onClick={() => applicant?.refresh({ background: true })}>Back to dashboard</Link>}</div></section> : <form className="student-card student-form" onSubmit={save}>{kind !== "ACCEPTANCE" && <details><summary>Before you complete this form</summary><p>Enter only accurate information. Do not sign on behalf of a guarantor or witness. The school may require the printed original with handwritten signatures.</p></details>}
    {kind === "ACCEPTANCE" && result.acceptance && <dl className="student-definition-grid">
      <div><dt>Application form number</dt><dd>{result.acceptance.applicationNumber}</dd></div>
      <div><dt>Academic session</dt><dd>{result.acceptance.session || "Not yet set"}</dd></div>
      <div><dt>Programme</dt><dd>{result.acceptance.programme}</dd></div>
      <div><dt>Offer response</dt><dd>Accepted</dd></div>
    </dl>}
    <div className="student-field-grid">
      {result.fields.filter(([, , , type]) => type !== "checkbox").map(([key, label, required, type]) => (
        <label key={key}>
          {label}{required ? " *" : ""}
          <input type={type === "email" ? "email" : "text"} required={required} value={values[key] || ""} maxLength={key.toLowerCase().includes("address") ? 300 : 100} disabled={busy} onChange={(event) => setValues({ ...values, [key]: event.target.value })} />
        </label>
      ))}
    </div>
    {result.fields.filter(([, , , type]) => type === "checkbox").map(([key, label, required]) => (
      <label className="check-field" key={key}>
        <input type="checkbox" required={required} checked={Boolean(values[key])} disabled={busy} onChange={(event) => setValues({ ...values, [key]: event.target.checked })} />
        {label}
      </label>
    ))}
    <div className="school-form-submit">
      <button className="button primary" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit form"}</button>
    </div>
  </form>}</div>;
}
