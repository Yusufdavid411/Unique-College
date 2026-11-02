import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../../api/client.js";
import { ErrorToast } from "../../components/ToastNotifications.jsx";
import { notify } from "../../api/notifications.js";
const empty = { title: "", body: "", isPublished: false };
export default function AdminAnnouncements() {
  const [result, setResult] = useState({ items: [], total: 0 });
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(""); api.get("/announcements", { params: { page }, signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setResult(data.data); }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [page, revision]);
  async function save(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try { if (editing) await api.patch(`/announcements/${editing.id}`, { ...draft, version: editing.updatedAt }); else await api.post("/announcements", draft); setDraft(empty); setEditing(null); setPage(1); setRevision((value) => value + 1); notify({ title: "Announcement saved", message: draft.isPublished ? "The notice is visible in the student portal." : "Saved as a draft; students cannot see it yet.", type: "info" }); }
    catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <div className="admin-page"><header className="admin-header"><span className="eyebrow">Student communication</span><h1>Announcements</h1><p>Publish concise notices for admitted students. Drafts stay private.</p></header><ErrorToast message={error} /><div className="staff-accounts"><form className="form-panel" onSubmit={save}><h2>{editing ? "Edit announcement" : "Create announcement"}</h2><label>Title<input value={draft.title} required minLength={3} maxLength={160} disabled={busy} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label>Message<textarea value={draft.body} required minLength={5} maxLength={6000} rows={6} disabled={busy} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label><label className="check-field"><input type="checkbox" checked={draft.isPublished} disabled={busy} onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })} />Publish to the student portal</label><div className="portal-form-actions"><button className="button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save announcement"}</button>{editing && <button type="button" className="button secondary" disabled={busy} onClick={() => { setEditing(null); setDraft(empty); }}>Cancel edit</button>}</div></form><section className="admin-list"><h2>Saved announcements</h2>{loading ? <p>Loading notices…</p> : result.items.map((item) => <article className="admin-list-item" key={item.id}><div><strong>{item.title}</strong><span>{item.isPublished ? "Published" : "Draft"}</span><p>{item.body.slice(0, 140)}{item.body.length > 140 ? "…" : ""}</p></div><button type="button" disabled={busy} onClick={() => { setEditing(item); setDraft({ title: item.title, body: item.body, isPublished: item.isPublished }); window.scrollTo({ top: 0, behavior: "instant" }); }}>Edit</button></article>)}{!loading && !result.items.length && <p>No announcements yet.</p>}<nav className="portal-form-actions" aria-label="Saved announcement pages"><button type="button" disabled={loading || page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page}</span><button type="button" disabled={loading || page * 25 >= result.total} onClick={() => setPage((value) => value + 1)}>Next</button></nav></section></div></div>;
}
