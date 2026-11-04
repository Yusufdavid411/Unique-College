import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client.js";
import { portalPath } from "../../api/portalLinks.js";
import AdminNotice from "../../components/AdminNotice.jsx";
import AdminDirectorySearch from "../../components/AdminDirectorySearch.jsx";

export default function AdminStudents() {
  const [result, setResult] = useState({ students: [], total: 0 });
  const [query, setQuery] = useState({ page: 1, search: "", sessionId: "", departmentId: "" });
  const [options, setOptions] = useState(null);
  const [optionsError, setOptionsError] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setOptionsError("");
    api.get("/academic/options", { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setOptions(data.data); })
      .catch((failure) => { if (!controller.signal.aborted) setOptionsError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(Boolean(query.sessionId));
    setError("");
    setResult({ students: [], total: 0 });
    if (!query.sessionId) return () => controller.abort();
    api.get("/students", { params: { ...query, departmentId: query.departmentId || undefined }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setResult(data.data); })
      .catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure, "Student records could not be loaded.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, revision]);

  return <div className="admin-page">
    <header className="admin-header"><span className="eyebrow">Student records</span><h1>Students</h1><p>Admitted applicants appear here automatically. Admission decisions stay under Applications.</p><Link className="button secondary" to={portalPath("/admin/applications")}>Review applications</Link></header>
    <div className="form-panel settings-field-grid">
      <label>Academic session<select value={query.sessionId} disabled={!options} onChange={(event) => setQuery({ page: 1, search, sessionId: event.target.value, departmentId: "" })}><option value="">Choose a session</option>{options?.sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}<option value="unassigned">Not yet assigned to a session</option></select></label>
      <label>Department<select value={query.departmentId} disabled={!options || !query.sessionId || query.sessionId === "unassigned"} onChange={(event) => setQuery({ ...query, page: 1, departmentId: event.target.value })}><option value="">All departments</option>{options?.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
    </div>
    <AdminDirectorySearch label="Search students" placeholder="Name, email, ID, programme, department or level" value={search} onChange={setSearch} onSearch={(value) => setQuery((current) => ({ ...current, page: 1, search: value }))} disabled={loading || !query.sessionId} />
    {optionsError && <><AdminNotice type="error">{optionsError}</AdminNotice><button className="button secondary" type="button" onClick={() => setRevision((value) => value + 1)}>Retry academic options</button></>}
    <AdminNotice type="error">{error}</AdminNotice>
    {!query.sessionId ? <p>Choose an academic session to browse its students.</p> : error ? <button className="button secondary" type="button" onClick={() => setRevision((value) => value + 1)}>Try again</button> : <>
      <div className="admin-table-card"><div className="admin-table-wrap"><table className="review-queue" aria-label="Admitted students" aria-busy={loading}>
        <thead><tr><th>Student</th><th>Student number</th><th>Programme</th><th>Account</th><th>Admitted</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={5}>Loading students…</td></tr> : result.students.length ? result.students.map((student) => <tr key={student.id}>
          <td data-label="Student"><Link to={portalPath(`/admin/students/${student.id}`)}><strong>{student.fullName}</strong></Link><small>{student.email}</small><small>{student.applicationNumber}</small></td>
          <td data-label="Student number">{student.studentNumber || "Not assigned"}</td>
          <td data-label="Programme">{student.courseOfInterest || "Not assigned"}</td>
          <td data-label="Account"><strong>{student.applicant.portalUsername || "Not assigned"}</strong><small>{student.applicant.isActive ? "Active" : "Inactive"}</small></td>
          <td data-label="Admitted">{student.admittedAt ? new Date(student.admittedAt).toLocaleDateString("en-NG") : "Not recorded"}</td>
        </tr>) : <tr><td colSpan={5}>No admitted students match these filters.</td></tr>}</tbody>
      </table></div></div>
      <nav className="portal-form-actions" aria-label="Student pages"><button type="button" disabled={loading || query.page === 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}>Previous</button><span aria-live="polite">Page {query.page} of {Math.max(1, Math.ceil(result.total / 25))}</span><button type="button" disabled={loading || query.page * 25 >= result.total} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}>Next</button></nav>
    </>}
  </div>;
}
