import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../../api/client.js";

export default function AdminAudit() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ entries: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    api.get("/audit", { params: { page, limit: 25 } }).then((response) => { if (current) setResult(response.data.data); })
      .catch((requestError) => { if (current) setError(apiErrorMessage(requestError)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [page]);
  return <div className="admin-page"><header className="admin-header"><span className="eyebrow">Accountability</span><h1>Audit history</h1><p>Recorded actions for institutional access and admissions decisions.</p></header>{error && <p role="alert">{error}</p>}<div className="admin-table-wrap"><table><thead><tr><th>Time</th><th>Action</th><th>Actor ID</th><th>Record</th></tr></thead><tbody>{loading ? <tr><td colSpan={4}>Loading history…</td></tr> : result.entries.map((entry) => <tr key={entry.id}><td>{new Date(entry.createdAt).toLocaleString()}</td><td>{entry.action}</td><td>{entry.actorId}</td><td>{entry.targetType}<small>{entry.targetId}</small></td></tr>)}{!loading && !result.entries.length && <tr><td colSpan={4}>No audit entries yet.</td></tr>}</tbody></table></div><div className="portal-form-actions"><button type="button" disabled={loading || page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} · {result.total} records</span><button type="button" disabled={loading || page * 25 >= result.total} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>;
}
