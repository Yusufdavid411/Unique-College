import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../../api/client.js";

export default function AdminUsers() {
  const [result, setResult] = useState({ users: [], total: 0 });
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [busy, setBusy] = useState(false);
  async function load() { setResult((await api.get("/users", { params: { page } })).data.data); }
  useEffect(() => { load().catch((error) => setNotice(apiErrorMessage(error))); }, [page]);
  async function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setCredentials(null); setNotice("");
    try {
      const response = await api.post("/users", { name: data.get("name"), email: data.get("email") });
      setCredentials({ email: response.data.data.user.email, password: response.data.data.temporaryPassword });
      form.reset(); await load();
    } catch (error) { setNotice(apiErrorMessage(error)); }
    finally { setBusy(false); }
  }
  async function toggle(user) {
    setBusy(true);
    try { await api.patch("/users/" + user.id, { isActive: !user.isActive }); await load(); setNotice("Staff access updated."); }
    catch (error) { setNotice(apiErrorMessage(error)); }
    finally { setBusy(false); }
  }
  return <div className="admin-page"><header className="admin-header"><span className="eyebrow">People</span><h1>Staff accounts</h1><p>Create staff accounts, then assign responsibilities under Roles. Staff portal workflows arrive in Stage 3.</p></header>{notice && <p role="status" className="admin-feedback">{notice}</p>}{credentials && <section className="admission-credentials"><strong>Share these credentials securely</strong><span>{credentials.email}</span><code>{credentials.password}</code><p>This temporary password is shown only now and must be changed at first sign-in.</p><button type="button" onClick={() => setCredentials(null)}>Hide credentials</button></section>}<div className="admin-two-col"><section className="admin-list">{result.users.map((user) => <article className="admin-list-item" key={user.id}><div><strong>{user.name}</strong><span>{user.email}</span><small>{user.role} · {user.isActive ? "Active" : "Inactive"}</small></div>{user.role === "STAFF" && <button type="button" disabled={busy} onClick={() => toggle(user)}>{user.isActive ? "Deactivate" : "Activate"}</button>}</article>)}<div className="portal-form-actions"><button type="button" disabled={busy || page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page}</span><button type="button" disabled={busy || page * 25 >= result.total} onClick={() => setPage((value) => value + 1)}>Next</button></div></section><form className="form-panel" onSubmit={create}><h2>Create staff account</h2><label>Full name<input name="name" minLength={2} maxLength={150} required autoComplete="name" /></label><label>Email<input name="email" type="email" required autoComplete="email" /></label><button type="submit" className="button" disabled={busy}>{busy ? "Creating…" : "Create staff account"}</button></form></div></div>;
}
