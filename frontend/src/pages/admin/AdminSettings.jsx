import { useEffect, useState } from "react";
import AdminNotice from "../../components/AdminNotice.jsx";
import LoadingButton from "../../components/LoadingButton.jsx";
import { api, apiErrorMessage } from "../../api/client.js";

export default function AdminSettings() {
  const [settings, setSettings] = useState([]);
  const [form, setForm] = useState({ key: "", value: "", group: "general" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });

  function load() {
    setLoading(true);
    api
      .get("/settings")
      .then((res) => setSettings(res.data.data))
      .catch((error) => setNotice({ type: "error", message: apiErrorMessage(error, "Settings could not be loaded.") }))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setNotice({ type: "", message: "" });
    try {
      await api.post("/settings", form);
      setForm({ key: "", value: "", group: "general" });
      setNotice({ type: "success", message: "Setting saved." });
      load();
    } catch (error) {
      setNotice({ type: "error", message: apiErrorMessage(error, "Setting could not be saved.") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-page admin-two-col">
      <section>
        <header className="admin-header"><span className="eyebrow">CMS</span><h1>Site settings</h1></header>
        <AdminNotice type={notice.type}>{notice.message}</AdminNotice>
        <div className="admin-list">
          {loading && <div className="empty-state">Loading settings...</div>}
          {!loading && !settings.length && <div className="empty-state">No settings have been saved yet.</div>}
          {!loading && settings.map((setting) => (
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
        <LoadingButton type="submit" loading={submitting} loadingText="Saving setting...">Save setting</LoadingButton>
      </form>
    </div>
  );
}
