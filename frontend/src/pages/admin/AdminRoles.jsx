import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../../api/client.js";

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [draft, setDraft] = useState({ name: "", permissions: [] });
  const [editing, setEditing] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [roleResponse, userResponse] = await Promise.all([api.get("/roles"), api.get("/roles/users", { params: { search } })]);
    setRoles(roleResponse.data.data.roles);
    setPermissions(roleResponse.data.data.permissions);
    setUsers(userResponse.data.data);
  }
  useEffect(() => {
    load().catch((error) => setNotice(apiErrorMessage(error))).finally(() => setLoading(false));
  }, []);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      if (editing) await api.put("/roles/" + editing, draft);
      else await api.post("/roles", draft);
      setEditing("");
      setDraft({ name: "", permissions: [] });
      await load();
      setNotice("Role saved.");
    } catch (error) { setNotice(apiErrorMessage(error)); }
    finally { setBusy(false); }
  }

  async function toggleAssignment(user, role, assigned) {
    setBusy(true);
    setNotice("");
    try {
      const endpoint = "/roles/" + role.id + "/users/" + user.id;
      if (assigned) await api.delete(endpoint);
      else await api.put(endpoint);
      await load();
      setNotice("Access updated.");
    } catch (error) { setNotice(apiErrorMessage(error)); }
    finally { setBusy(false); }
  }

  return <div className="admin-page">
    <header className="admin-header"><span className="eyebrow">Access management</span><h1>Roles and permissions</h1><p>Create roles for institutional responsibilities and assign them to staff.</p></header>
    {notice && <p role="status" className="admin-feedback">{notice}</p>}
    {loading ? <p>Loading access settings…</p> : <>
      <div className="admin-two-col">
        <section className="admin-list"><h2>Institution roles</h2>{!roles.length && <p>No custom roles yet. Administrators retain full access.</p>}{roles.map((role) => <article className="admin-list-item" key={role.id}><div><strong>{role.name}</strong><small>{role.permissions.length} permissions</small></div><button type="button" disabled={busy} onClick={() => { setEditing(role.id); setDraft({ name: role.name, permissions: role.permissions }); }}>Edit</button></article>)}</section>
        <form className="form-panel" onSubmit={save}><h2>{editing ? "Edit role" : "Create role"}</h2><label>Role name<input required minLength={2} maxLength={80} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="For example: Admissions Officer" /></label><fieldset><legend>Allowed actions</legend>{permissions.map((permission) => <label className="permission-option" key={permission}><input type="checkbox" checked={draft.permissions.includes(permission)} onChange={(event) => setDraft({ ...draft, permissions: event.target.checked ? [...draft.permissions, permission] : draft.permissions.filter((item) => item !== permission) })} />{permission.replaceAll(".", " · ").replaceAll("_", " ")}</label>)}</fieldset><button className="button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save role"}</button>{editing && <button type="button" onClick={() => { setEditing(""); setDraft({ name: "", permissions: [] }); }}>Cancel edit</button>}</form>
      </div>
      <section className="form-panel"><h2>Staff role assignments</h2><p>Showing up to 100 staff. Assigning a role grants its permissions immediately. The staff portal is a later stage.</p><form className="access-search" onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { await load(); } catch (error) { setNotice(apiErrorMessage(error)); } finally { setBusy(false); } }}><label>Search staff<input value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" /></label><button type="submit" disabled={busy}>Search</button></form>{users.map((user) => <article className="staff-access-row" key={user.id}><div><strong>{user.name}</strong><p>{user.email} · {user.role}{!user.isActive ? " · Inactive" : ""}</p></div><div>{roles.map((role) => { const assigned = user.roleAssignments.some((assignment) => assignment.roleId === role.id); return <label className="permission-option" key={role.id}><input type="checkbox" checked={assigned} disabled={busy || !user.isActive} onChange={() => toggleAssignment(user, role, assigned)} />{role.name}</label>; })}</div></article>)}</section>
    </>}
  </div>;
}
