import { useEffect, useState } from "react";
import AdminNotice from "../../components/AdminNotice.jsx";
import LoadingButton from "../../components/LoadingButton.jsx";
import { api, apiErrorMessage, assetUrl } from "../../api/client.js";

export default function AdminApplications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });

  function load() {
    setLoading(true);
    api
      .get("/applications")
      .then((res) => setItems(res.data.data))
      .catch((error) => setNotice({ type: "error", message: apiErrorMessage(error, "Applications could not be loaded.") }))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function updateStatus(id, status) {
    setBusyId(id);
    setNotice({ type: "", message: "" });
    try {
      await api.patch(`/applications/${id}/status`, { status, reviewNote: "" });
      setNotice({ type: "success", message: "Application status updated." });
      load();
    } catch (error) {
      setNotice({ type: "error", message: apiErrorMessage(error, "Application status could not be updated.") });
    } finally {
      setBusyId("");
    }
  }

  async function remove(id) {
    setBusyId(id);
    setNotice({ type: "", message: "" });
    try {
      await api.delete(`/applications/${id}`);
      setNotice({ type: "success", message: "Application deleted." });
      load();
    } catch (error) {
      setNotice({ type: "error", message: apiErrorMessage(error, "Application could not be deleted.") });
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header"><span className="eyebrow">Admissions</span><h1>Manage applications</h1></header>
      <AdminNotice type={notice.type}>{notice.message}</AdminNotice>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Course</th><th>Phone</th><th>Status</th><th>Passport</th><th>Action</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan="6">Loading applications...</td></tr>}
            {!loading && !items.length && <tr><td colSpan="6">No applications have been submitted yet.</td></tr>}
            {!loading && items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.fullName}</strong><span>{item.email}</span></td>
                <td>{item.courseOfInterest}</td>
                <td>{item.phoneNumber}</td>
                <td><span className={`status ${item.status.toLowerCase()}`}>{item.status}</span></td>
                <td>{item.passportPath ? <a href={assetUrl(item.passportPath)} target="_blank" rel="noreferrer">View</a> : "None"}</td>
                <td className="table-actions">
                  <select value={item.status} disabled={busyId === item.id} onChange={(e) => updateStatus(item.id, e.target.value)}>
                    <option value="PENDING">Pending</option>
                    <option value="REVIEWED">Reviewed</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                  <LoadingButton className="danger-button" loading={busyId === item.id} loadingText="Working..." onClick={() => remove(item.id)}>
                    Delete
                  </LoadingButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
