import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client.js";
import { portalPath } from "../../api/portalLinks.js";
import AdminNotice from "../../components/AdminNotice.jsx";

export default function AdminStudents() {
  const [result, setResult] = useState({ students: [], total: 0 });
  const [query, setQuery] = useState({ page: 1, search: "", testing: "false" });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setResult({ students: [], total: 0 });
    api.get("/students", { params: query, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setResult(data.data); })
      .catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure, "Student records could not be loaded.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, revision]);

  function findStudents(event) {
    event.preventDefault();
    setQuery((current) => ({ ...current, page: 1, search: search.trim() }));
  }

  return <div className="admin-page">
    <header className="admin-header"><span className="eyebrow">Student records</span><h1>Students</h1><p>Admitted applicants appear here automatically. Admission decisions stay under Applications.</p><Link className="button secondary" to={portalPath("/admin/applications")}>Review applications</Link></header>
    <form className="student-search" onSubmit={findStudents}><label>Find a student<input type="search" value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, student number or programme" /></label><button type="submit" className="button" disabled={loading}>Search</button></form>
    <label className="check-field"><input type="checkbox" checked={query.testing === "true"} onChange={(event) => setQuery((current) => ({ ...current, page: 1, testing: event.target.checked ? "true" : "false" }))} />Preview records only</label>
    <AdminNotice type="error">{error}</AdminNotice>
    {error ? <button className="button secondary" type="button" onClick={() => setRevision((value) => value + 1)}>Try again</button> : <>
      <div className="admin-table-card"><div className="admin-table-wrap"><table className="review-queue" aria-label="Admitted students" aria-busy={loading}>
        <thead><tr><th>Student</th><th>Student number</th><th>Programme</th><th>Account</th><th>Admitted</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={5}>Loading students…</td></tr> : result.students.length ? result.students.map((student) => <tr key={student.id}>
          <td data-label="Student"><Link to={portalPath(`/admin/students/${student.id}`)}><strong>{student.fullName}</strong></Link><small>{student.email}</small><small>{student.applicationNumber}</small></td>
          <td data-label="Student number">{student.studentNumber || "Not assigned"}</td>
          <td data-label="Programme">{student.courseOfInterest || "Not assigned"}</td>
          <td data-label="Account"><strong>{student.applicant.portalUsername || "Not assigned"}</strong><small>{!student.applicant.isActive ? "Inactive" : student.applicant.mustChangePassword ? "Activation pending" : "Active"}</small></td>
          <td data-label="Admitted">{student.admittedAt ? new Date(student.admittedAt).toLocaleDateString("en-NG") : "Not recorded"}</td>
        </tr>) : <tr><td colSpan={5}>{query.search ? "No admitted students match your search." : "No admitted students yet. Complete admission under Applications to add a student."}</td></tr>}</tbody>
      </table></div></div>
      <nav className="portal-form-actions" aria-label="Student pages"><button type="button" disabled={loading || query.page === 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}>Previous</button><span aria-live="polite">Page {query.page} of {Math.max(1, Math.ceil(result.total / 25))}</span><button type="button" disabled={loading || query.page * 25 >= result.total} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}>Next</button></nav>
    </>}
  </div>;
}
