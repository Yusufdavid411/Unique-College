import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../../api/client.js";
import { notify } from "../../api/notifications.js";
import { ErrorToast } from "../../components/ToastNotifications.jsx";
import AcademicWorkspace from "../../components/AcademicWorkspace.jsx";
const sections = [["departments", "Departments"], ["programmes", "Programmes"], ["sessions", "Academic sessions"], ["levels", "Levels"]];
export default function AdminAcademic() {
  const [options, setOptions] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => { const controller = new AbortController(); api.get("/academic/options", { signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setOptions(data.data); }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); }); return () => controller.abort(); }, [revision]);
  async function create(event, type) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const data = Object.fromEntries([...fields.entries()]);
    setBusy(true); setError("");
    try { await api.post(`/academic/${type}`, data); form.reset(); notify({ title: "Academic record saved", message: "You can now use this record for student assignments.", type: "info" }); setRevision((value) => value + 1); }
    catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function toggle(type, item) {
    if (busy) return; setBusy(true); setError("");
    try { await api.patch(`/academic/${type}/${item.id}`, { isActive: !item.isActive }); setRevision((value) => value + 1); }
    catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <div className="admin-page"><header className="admin-header"><span className="eyebrow">Academic registry</span><h1>Academic setup</h1><p>Add the school's official departments, programmes, sessions and levels. No student is assigned automatically.</p></header><ErrorToast message={error} />{!options ? <section className="form-panel"><p>{error ? "Academic setup could not load." : "Loading academic setup…"}</p>{error && <button type="button" className="button" onClick={() => setRevision((value) => value + 1)}>Try again</button>}</section> : <div className="staff-accounts"><AcademicWorkspace key={revision} />{sections.map(([type, title]) => <details className="settings-panel" key={type}><summary>{title}</summary><form className="form-panel" onSubmit={(event) => create(event, type)}><h2>Add {type === "sessions" ? "academic session" : type.slice(0, -1)}</h2><fieldset className="student-field-grid" disabled={busy}>{type !== "sessions" && <label>Code<input name="code" required maxLength={30} /></label>}<label>Name<input name="name" required minLength={2} maxLength={200} /></label>{type === "programmes" && <label>Department<select name="departmentId" required defaultValue=""><option value="">Choose an active department</option>{options.departments.filter((item) => item.isActive).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}{type === "sessions" && <><label>Starts<input name="startsAt" type="date" required /></label><label>Ends<input name="endsAt" type="date" required /></label></>}</fieldset><div><button className="button" disabled={busy} type="submit">Add record</button></div></form><div className="admin-list academic-record-list">{!options[type].length ? <p>No records configured.</p> : options[type].map((item) => <article className="admin-list-item" key={item.id}><div><strong>{item.name}</strong><span>{item.code || `${item.startsAt.slice(0, 10)} — ${item.endsAt.slice(0, 10)}`}</span><small>{item.isActive ? "Available for assignment" : "Unavailable for new assignments"}</small></div><button type="button" disabled={busy} onClick={() => toggle(type, item)}>{item.isActive ? "Disable" : "Enable"}</button></article>)}</div></details>)}</div>}</div>;
}
