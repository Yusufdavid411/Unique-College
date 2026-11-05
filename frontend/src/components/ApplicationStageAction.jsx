import { useState } from "react";
import { api, apiErrorMessage } from "../api/client.js";
import { notify } from "../api/notifications.js";
import { useConfirmation } from "../context/ConfirmationContext.jsx";

export default function ApplicationStageAction({ applications, action, label, refresh }) {
  const confirm = useConfirmation();
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const eligible = applications.filter((application) => application.nextBatchAction === action);
  const targets = eligible.filter((application) => selected.includes(application.id));
  async function advance() {
    if (busy || !targets.length) return;
    setBusy(true);
    try {
      if (!await confirm({ title: label + "?", message: `Advance ${targets.length} selected applicant(s)? Confirm that you have reviewed their records. Payments, documents and admission checks are rechecked for every person.`, confirmLabel: label })) return;
      setProcessed(0);
      setTotal(targets.length);
      const failures = [];
      let completed = 0;
      for (const [index, application] of targets.entries()) {
        try { await api.patch(`/applications/${application.id}/status`, { status: action }, { timeout: 60000, notifyOnError: false }); completed++; }
        catch (error) { failures.push(application.id); notify({ title: `Could not advance ${application.fullName}`, message: apiErrorMessage(error) }); }
        setProcessed(index + 1);
      }
      setSelected(failures);
      notify({ title: "Group action complete", message: `${completed} advanced. ${failures.length} require attention.`, type: "info" });
      await refresh();
    } finally { setBusy(false); }
  }
  return <section className="form-panel stage-action-panel"><h2>{label}</h2><p>{eligible.length} ready in these results. Incomplete records are not advanced.</p>
    {eligible.length > 0 && <details><summary>Select applicants</summary><div className="document-page-actions"><button className="button secondary" type="button" disabled={busy} onClick={() => setSelected(eligible.slice(0, 20).map(({ id }) => id))}>Select ready applicants (up to 20)</button><button className="button secondary" type="button" disabled={busy} onClick={() => setSelected([])}>Clear selection</button></div><fieldset className="bulk-notice-recipients" disabled={busy}><legend>Reviewed applicants</legend>{eligible.map((application) => <label className="check-field" key={application.id}><input type="checkbox" checked={selected.includes(application.id)} disabled={targets.length >= 20 && !selected.includes(application.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, application.id] : selected.filter((id) => id !== application.id))} />{application.fullName} · {application.applicationNumber}</label>)}</fieldset></details>}
    <div><button type="button" className="button primary" disabled={busy || !targets.length} onClick={advance}>{busy ? `Processing ${processed}/${total}…` : `${label} (${targets.length})`}</button></div>
  </section>;
}
