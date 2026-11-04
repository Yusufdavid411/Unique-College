import { useState } from "react";
import { api, apiErrorMessage } from "../api/client.js";
import { useConfirmation } from "../context/ConfirmationContext.jsx";

const batchLimit = 20;

export default function BulkFinalAdmission({ applications, refresh }) {
  const confirm = useConfirmation();
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const eligible = applications.filter((application) => application.finalAdmissionReady);
  const targets = eligible.filter(({ id }) => selected.includes(id));

  async function admit(event) {
    event.preventDefault();
    if (busy || !targets.length) return;
    setBusy(true);
    try {
      if (!await confirm({
        title: "Confirm final admission?",
        message: `Admit ${targets.length} selected applicant(s) and notify them? Each record must still pass the admission checks.`,
        confirmLabel: "Confirm final admission"
      })) return;
      let admitted = 0;
      const failures = [];
      for (const applicant of targets) {
        try {
          await api.patch(`/applications/${applicant.id}/status`, { status: "ADMITTED" }, { notifyOnError: false });
          admitted++;
        } catch (error) {
          failures.push({ id: applicant.id, name: applicant.fullName, message: apiErrorMessage(error, "Check the current application status before retrying.") });
        }
      }
      setSelected(failures.map(({ id }) => id));
      setFeedback({ admitted, failures });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return <details className="settings-panel">
    <summary>Bulk final admission ({eligible.length} ready)</summary>
    <form className="form-panel" onSubmit={admit}>
      <p>Only applicants with verified documents, completed clearance and a released letter can be selected. Select up to {batchLimit} at a time.</p>
      {eligible.length > 0 && <fieldset className="bulk-notice-recipients" disabled={busy}>
        <legend>Ready applicants in these results</legend>
        {eligible.map(({ id, fullName, applicationNumber }) => <label className="check-field" key={id}>
          <input type="checkbox" checked={selected.includes(id)} disabled={targets.length >= batchLimit && !selected.includes(id)} onChange={(event) => setSelected(event.target.checked ? [...targets.map((entry) => entry.id), id] : selected.filter((entry) => entry !== id))} />
          {fullName} · {applicationNumber}
        </label>)}
      </fieldset>}
      <div><button className="button primary" type="submit" disabled={busy || !targets.length}>{busy ? "Processing…" : `Admit selected (${targets.length})`}</button></div>
      {feedback && <div role="status"><p>{feedback.admitted} admitted. {feedback.failures.length} not confirmed.</p>{feedback.failures.length > 0 && <ul>{feedback.failures.map(({ id, name, message }) => <li key={id}>{name}: {message}</li>)}</ul>}</div>}
    </form>
  </details>;
}
