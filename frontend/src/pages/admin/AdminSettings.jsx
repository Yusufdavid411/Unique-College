import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminNotice from "../../components/AdminNotice.jsx";
import LoadingButton from "../../components/LoadingButton.jsx";
import ChangePassword from "../../components/ChangePassword.jsx";
import { api, apiErrorMessage } from "../../api/client.js";
import { useAdmissions } from "../../context/AdmissionsContext.jsx";
import { useSchool } from "../../context/SchoolContext.jsx";
import { schoolSettingsFormValues, schoolSettingsSections } from "../../data/schoolSettings.js";

export default function AdminSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const security = searchParams.get("tab") === "security";
  return <div className="admin-page"><header className="admin-header"><span className="eyebrow">Administration</span><h1>Settings</h1><p>Manage admissions, school information, and account security.</p></header><div className="review-filters" role="group" aria-label="Settings sections"><button type="button" aria-pressed={!security} onClick={() => setSearchParams({})}>School settings</button><button type="button" aria-pressed={security} onClick={() => setSearchParams({ tab: "security" })}>Account security</button></div>{security ? <ChangePassword embedded /> : <SchoolSettings />}</div>;
}

function SchoolSettings() {
  const dirtyFields = useRef(new Set());
  const [values, setValues] = useState(() => schoolSettingsFormValues());
  const [admissions, setAdmissions] = useState(null);
  const [saving, setSaving] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const { updateSchoolSettings } = useSchool();
  const { refresh: refreshAdmissions } = useAdmissions();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    Promise.all([api.get("/settings/school", { signal: controller.signal }), api.get("/settings/admissions", { signal: controller.signal })])
      .then(([profile, policy]) => { if (!controller.signal.aborted) { dirtyFields.current.clear(); setValues(schoolSettingsFormValues(profile.data.data)); setAdmissions(policy.data.data); } })
      .catch((error) => { if (!controller.signal.aborted) { setFailed(true); setNotice({ type: "error", message: apiErrorMessage(error, "Settings could not be loaded.") }); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  function changeField(key, value) {
    dirtyFields.current.add(key);
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  async function saveAdmissions(event) {
    event.preventDefault();
    if (saving) return;
    setSaving("admissions");
    setNotice({ type: "", message: "" });
    try {
      const { data } = await api.put("/settings/admissions", { open: admissions.open, message: admissions.message, applicationFee: admissions.applicationFee });
      setAdmissions(data.data);
      setNotice({ type: "success", message: "Admissions settings saved." });
      refreshAdmissions();
    } catch (error) { setNotice({ type: "error", message: apiErrorMessage(error) }); }
    finally { setSaving(""); }
  }

  async function saveSection(event, section) {
    event.preventDefault();
    if (saving) return;
    setSaving(section.id);
    setNotice({ type: "", message: "" });
    try {
      const changes = Object.fromEntries(section.fields.map((field) => [field.key, values[field.key]]));
      const { data } = await api.patch("/settings/school", changes);
      updateSchoolSettings(data.data);
      section.fields.forEach((field) => dirtyFields.current.delete(field.key));
      setValues((previous) => ({ ...schoolSettingsFormValues(data.data), ...Object.fromEntries([...dirtyFields.current].map((key) => [key, previous[key]])) }));
      setNotice({ type: "success", message: `${section.title} saved. The website now uses these details.` });
    } catch (error) { setNotice({ type: "error", message: apiErrorMessage(error) }); }
    finally { setSaving(""); }
  }

  return <div className="school-settings">
    <AdminNotice type={notice.type}>{notice.message}</AdminNotice>
    {loading ? <p role="status">Loading school settings…</p> : failed ? <div className="empty-state"><p>Settings could not load.</p><button type="button" className="button" onClick={() => setRevision((value) => value + 1)}>Try again</button></div> : <>
      {admissions && <form className="form-panel" onSubmit={saveAdmissions}>
        <h2>Admissions availability</h2>
        <div className="settings-field-grid">
          <label>Status<select disabled={Boolean(saving)} value={String(admissions.open)} onChange={(event) => setAdmissions({ ...admissions, open: event.target.value === "true" })}><option value="false">Admissions closed</option><option value="true">Admissions open</option></select></label>
          <label>Application form price (NGN)<input disabled={Boolean(saving)} type="number" min="0" max="10000000" step="0.01" value={admissions.applicationFee ?? ""} onChange={(event) => setAdmissions({ ...admissions, applicationFee: event.target.value === "" ? null : Number(event.target.value) })} /></label>
          <label className="settings-full-width">Public admissions message<textarea disabled={Boolean(saving)} required minLength={5} maxLength={500} rows={3} value={admissions.message} onChange={(event) => setAdmissions({ ...admissions, message: event.target.value })} /></label>
        </div>
        <details className="settings-help"><summary>How these controls work</summary><p>New applicants keep the form price quoted when they register. Closing admissions stops new registrations without removing existing applicants' access. Payments use the configured online checkout; bank instructions are no longer needed here.</p></details>
        <LoadingButton type="submit" disabled={Boolean(saving)} loading={saving === "admissions"} loadingText="Saving…">Save admissions settings</LoadingButton>
      </form>}
      {schoolSettingsSections.map((section) => <details className="settings-panel" key={section.id}>
        <summary>{section.title}</summary>
        <form className="form-panel" onSubmit={(event) => saveSection(event, section)}>
          <div className="settings-field-grid">{section.fields.map((field) => <label className={field.multiline ? "settings-full-width" : undefined} key={field.key}>{field.label}{field.multiline ? <textarea required rows={4} disabled={Boolean(saving)} maxLength={field.maxLength} value={values[field.key]} onChange={(event) => changeField(field.key, event.target.value)} /> : <input required type={field.type || "text"} disabled={Boolean(saving)} maxLength={field.maxLength} value={values[field.key]} onChange={(event) => changeField(field.key, event.target.value)} />}</label>)}</div>
          <LoadingButton type="submit" disabled={Boolean(saving)} loading={saving === section.id} loadingText="Saving…">Save {section.title.toLowerCase()}</LoadingButton>
        </form>
      </details>)}
    </>}
  </div>;
}
