import { useEffect, useState } from "react";
import AdminNotice from "../../components/AdminNotice.jsx";
import LoadingButton from "../../components/LoadingButton.jsx";
import { api, apiErrorMessage } from "../../api/client.js";

export default function AdminSettings() {
  const [settings, setSettings] = useState([]);
  const [admissions, setAdmissions] = useState(null);
  const [savingAdmissions, setSavingAdmissions] = useState(false);
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
  useEffect(() => {
    api.get("/settings/admissions").then((res) => setAdmissions(res.data.data))
      .catch((error) => setNotice({ type: "error", message: apiErrorMessage(error) }));
  }, []);

  async function saveAdmissions(event) {
    event.preventDefault();
    setSavingAdmissions(true);
    try {
      await api.put("/settings/admissions", admissions);
      setNotice({ type: "success", message: "Admissions availability saved. Existing applicants can still sign in." });
      load();
    } catch (error) {
      setNotice({ type: "error", message: apiErrorMessage(error) });
    } finally {
      setSavingAdmissions(false);
    }
  }

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
        {admissions && <form className="form-panel" onSubmit={saveAdmissions}>
          <h2>Admissions availability</h2>
          <label>Status<select value={String(admissions.open)} onChange={(event) => setAdmissions({ ...admissions, open: event.target.value === "true" })}>
            <option value="false">Admissions closed</option><option value="true">Admissions open</option>
          </select></label>
          <label>Public message<textarea required minLength={5} maxLength={500} value={admissions.message} onChange={(event) => setAdmissions({ ...admissions, message: event.target.value })} /></label>
          <label>Approved form price (NGN)<input type="number" min="0" max="10000000" step="0.01" value={admissions.applicationFee ?? ""} onChange={(event) => setAdmissions({ ...admissions, applicationFee: event.target.value === "" ? null : Number(event.target.value) })} /></label>
          <label>Bank details and payment instructions<textarea maxLength={3000} rows={5} value={admissions.paymentInstructions || ""} onChange={(event) => setAdmissions({ ...admissions, paymentInstructions: event.target.value })} placeholder="Bank name, account name, account number and payment instructions." /></label>
          <p>New applicants keep the quoted form price. A verified application-fee payment unlocks their full form. Set zero only if the school explicitly offers free forms.</p>
          <p>Closing admissions stops new registrations. Existing applicants retain access to their application and progress.</p>
          <LoadingButton type="submit" loading={savingAdmissions} loadingText="Saving...">Save admissions status</LoadingButton>
        </form>}
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
