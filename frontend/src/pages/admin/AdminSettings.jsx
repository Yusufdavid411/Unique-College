import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

export default function AdminSettings() {
  const [settings, setSettings] = useState([]);
  const [form, setForm] = useState({ key: "", value: "", group: "general" });

  function load() {
    api.get("/settings").then((res) => setSettings(res.data.data));
  }

  useEffect(load, []);

  async function submit(event) {
    event.preventDefault();
    await api.post("/settings", form);
    setForm({ key: "", value: "", group: "general" });
    load();
  }

  return (
    <div className="admin-page admin-two-col">
      <section>
        <header className="admin-header"><span className="eyebrow">CMS</span><h1>Site settings</h1></header>
        <div className="admin-list">
          {settings.map((setting) => (
            <article className="admin-list-item" key={setting.id}>
              <div><strong>{setting.key}</strong><span>{setting.value}</span></div>
              <small>{setting.group}</small>
            </article>
          ))}
        </div>
      </section>
      <form className="form-panel" onSubmit={submit}>
        <h2>Save setting</h2>
        <input required placeholder="Key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
        <input required placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
        <input required placeholder="Group" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} />
        <button className="button primary" type="submit">Save setting</button>
      </form>
    </div>
  );
}
