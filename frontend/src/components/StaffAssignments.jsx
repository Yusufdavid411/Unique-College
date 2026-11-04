import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useConfirmation } from "../context/ConfirmationContext.jsx";

export default function StaffAssignments() {
  const confirmAction = useConfirmation();
  const [options, setOptions] = useState({ staff: [], enrolments: [] });
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  async function load() {
    const [choices, records] = await Promise.all([api.get("/staff-assignments/options", { params: { search } }), api.get("/staff-assignments", { params: { page } })]);
    setOptions(choices.data.data); setResult(records.data.data); setFailed(false);
  }
  useEffect(() => { let current = true; api.get("/staff-assignments", { params: { page } }).then((response) => { if (current) setResult(response.data.data); }).catch(() => { if (current) setFailed(true); }); return () => { current = false; }; }, [page]);
  async function find(event) { event.preventDefault(); setBusy(true); try { await load(); } catch { setFailed(true); } finally { setBusy(false); } }
  async function assign(event) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true); setNotice("");
    try { const response = await api.post("/staff-assignments", data); setNotice(response.data.message); form.reset(); await load(); }
    catch {} finally { setBusy(false); }
  }
  async function remove(id) {
    if (!await confirmAction({ title: "Remove adviser assignment?", message: "This staff member will lose access to the selected student and session.", confirmLabel: "Remove assignment", danger: true })) return;
    setBusy(true); setNotice("");
    try { await api.delete(`/staff-assignments/${id}`); setNotice("Assignment removed."); await load(); }
    catch {} finally { setBusy(false); }
  }
  return <section className="student-card"><h2>Student adviser assignments</h2><p>First create a role with “View assigned students” (advisees.read), assign it to staff, then choose an admitted student with an academic-session assignment.</p><form className="access-search" onSubmit={find}><label>Find a student<input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} placeholder="Student name or email" /></label><button className="button secondary" disabled={busy}>Find students & staff</button></form><p>Up to 25 matching student-session records and 100 active staff are shown. Enter a student name to narrow the list.</p><form className="student-form" onSubmit={assign}><div className="student-field-grid"><label>Staff adviser<select name="staffId" required defaultValue=""><option value="">Choose eligible staff</option>{options.staff.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.email}</option>)}</select></label><label>Student & session<select name="enrolmentId" required defaultValue=""><option value="">Choose student and session</option>{options.enrolments.map((record) => <option key={record.id} value={record.id}>{record.student.user.name} · {record.session.name} · {record.programme.name}</option>)}</select></label></div><button className="button" disabled={busy}>{busy ? "Please wait…" : "Assign adviser"}</button></form>{notice && <p role="status">{notice}</p>}{failed && <p role="status">Assignments could not be refreshed. Use Find students & staff to try again.</p>}{result?.assignments.map((record) => <article className="staff-access-row" key={record.id}><div><strong>{record.enrolment.student.user.name}</strong><p>{record.staff.name} · {record.enrolment.session.name}</p><small>{record.enrolment.programme.name}</small></div><button disabled={busy} onClick={() => remove(record.id)}>Remove assignment</button></article>)}{result && !result.total && <p>No adviser assignments yet.</p>}<nav className="document-page-actions" aria-label="Adviser assignment pages"><button disabled={busy || page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page}</span><button disabled={busy || !result || page * 25 >= result.total} onClick={() => setPage((value) => value + 1)}>Next</button></nav></section>;
}
