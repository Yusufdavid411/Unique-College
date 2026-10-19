import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../../api/client.js";

const blank = { title: "", description: "", location: "", startsAt: "", endsAt: "", isPublished: false };
function localDate(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function load() { setEvents((await api.get("/events")).data.data); }
  useEffect(() => { load().catch((error) => setNotice(apiErrorMessage(error))); }, []);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = { ...form, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString() };
      if (editing) await api.put("/events/" + editing, data);
      else await api.post("/events", data);
      setForm(blank); setEditing(""); await load(); setNotice("Event saved.");
    } catch (error) { setNotice(apiErrorMessage(error)); }
    finally { setBusy(false); }
  }
  async function remove(id) {
    setBusy(true);
    try { await api.delete("/events/" + id); await load(); setNotice("Event removed."); }
    catch (error) { setNotice(apiErrorMessage(error)); }
    finally { setBusy(false); }
  }
  return <div className="admin-page"><header className="admin-header"><span className="eyebrow">Campus calendar</span><h1>Manage events</h1></header>{notice && <p role="status" className="admin-feedback">{notice}</p>}<div className="admin-two-col"><section className="admin-list">{!events.length && <p>No events yet.</p>}{events.map((event) => <article className="admin-list-item" key={event.id}><div><strong>{event.title}</strong><p>{new Date(event.startsAt).toLocaleString()} · {event.isPublished ? "Published" : "Draft"}</p><span>{event.location}</span></div><button disabled={busy} type="button" onClick={() => { setEditing(event.id); setForm({ title: event.title, description: event.description, location: event.location, startsAt: localDate(event.startsAt), endsAt: localDate(event.endsAt), isPublished: event.isPublished }); }}>Edit</button><button type="button" disabled={busy} onClick={() => remove(event.id)}>Delete</button></article>)}</section><form className="form-panel" onSubmit={save}><h2>{editing ? "Edit event" : "Create event"}</h2><label>Title<input required minLength={3} maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Location<input required minLength={2} maxLength={300} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label><label>Starts (your local time)<input type="datetime-local" required value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label><label>Ends (your local time)<input type="datetime-local" required min={form.startsAt} value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label><label>Description<textarea required minLength={10} maxLength={10000} rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label className="permission-option"><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} />Publish on website</label><button type="submit" className="button" disabled={busy}>{busy ? "Saving…" : "Save event"}</button>{editing && <button type="button" onClick={() => { setEditing(""); setForm(blank); }}>Cancel edit</button>}</form></div></div>;
}
