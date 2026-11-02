import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client.js";
import { portalPath } from "../../api/portalLinks.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { notify } from "../../api/notifications.js";
import { ErrorToast } from "../../components/ToastNotifications.jsx";
import ApplicationDownloads from "../../components/ApplicationDownloads.jsx";
export default function AdminStudentRecord() {
  const { id } = useParams();
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [options, setOptions] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { const controller = new AbortController(); setRecord(null); setError(""); Promise.all([api.get(`/students/${id}`, { signal: controller.signal }), api.get("/academic/options", { signal: controller.signal })]).then(([student, setup]) => { if (!controller.signal.aborted) { setRecord(student.data.data); setOptions(setup.data.data); } }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); }); return () => controller.abort(); }, [id, revision]);
  async function assign(event) {
    event.preventDefault(); if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError("");
    try { await api.post(`/students/${id}/enrolments`, values); notify({ title: "Assignment saved", message: "The student can now review and confirm their academic details.", type: "info" }); setRevision((value) => value + 1); }
    catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <div className="admin-page"><Link to={portalPath("/admin/students")}>← Students</Link><ErrorToast message={error} />{!record ? <section className="form-panel"><p>{error ? "Student record unavailable." : "Loading student record…"}</p>{error && <button type="button" className="button" onClick={() => setRevision((value) => value + 1)}>Try again</button>}</section> : <><header className="admin-header"><span className="eyebrow">Student record</span><h1>{record.user.name}</h1><p>{record.application.studentNumber} · {record.user.email}</p></header><section className="student-card"><h2>Academic assignments</h2>{!record.enrolments.length ? <p>No programme, session or level has been assigned.</p> : record.enrolments.map((entry) => <article key={entry.id} className="student-assignment-row"><strong>{entry.session.name} · {entry.programme.name}</strong><span>{entry.level.name} · {entry.status === "CONFIRMED" ? "Confirmed by student" : "Awaiting student confirmation"}</span></article>)}</section>{(user.role === "ADMIN" || user.permissions?.includes("students.manage")) && <form className="student-card student-form" onSubmit={assign}><h2>Assign academic details</h2><p>Existing confirmed records cannot be overwritten. An unconfirmed assignment in the selected session can be corrected.</p><fieldset disabled={busy} className="student-field-grid"><label>Programme<select name="programmeId" required defaultValue=""><option value="">Choose programme</option>{options.programmes.filter((item) => item.isActive && item.department.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Session<select name="sessionId" required defaultValue=""><option value="">Choose session</option>{options.sessions.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Level<select name="levelId" required defaultValue=""><option value="">Choose level</option>{options.levels.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></fieldset><div><button type="submit" className="button" disabled={busy}>{busy ? "Saving…" : "Save assignment"}</button></div><Link to={portalPath("/admin/academic")}>Manage official academic options</Link></form>}<details className="student-card"><summary>Admission documents and receipts</summary><ApplicationDownloads application={record.application} /></details><details className="student-card"><summary>Contact record</summary><dl className="student-definition-grid"><div><dt>Phone</dt><dd>{record.phoneNumber || "Not recorded"}</dd></div><div><dt>Address</dt><dd>{record.address || "Not recorded"}</dd></div><div><dt>Next of kin</dt><dd>{record.guardianName || "Not recorded"}</dd></div><div><dt>Next-of-kin phone</dt><dd>{record.guardianPhone || "Not recorded"}</dd></div></dl></details></>}</div>;
}
