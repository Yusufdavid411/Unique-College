import { useEffect, useState } from "react";
import { api, assetUrl } from "../../api/client.js";

export default function AdminApplications() {
  const [items, setItems] = useState([]);

  function load() {
    api.get("/applications").then((res) => setItems(res.data.data));
  }

  useEffect(load, []);

  async function updateStatus(id, status) {
    await api.patch(`/applications/${id}/status`, { status, reviewNote: "" });
    load();
  }

  async function remove(id) {
    await api.delete(`/applications/${id}`);
    load();
  }

  return (
    <div className="admin-page">
      <header className="admin-header"><span className="eyebrow">Admissions</span><h1>Manage applications</h1></header>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Course</th><th>Phone</th><th>Status</th><th>Passport</th><th>Action</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.fullName}</strong><span>{item.email}</span></td>
                <td>{item.courseOfInterest}</td>
                <td>{item.phoneNumber}</td>
                <td><span className={`status ${item.status.toLowerCase()}`}>{item.status}</span></td>
                <td>{item.passportPath ? <a href={assetUrl(item.passportPath)} target="_blank" rel="noreferrer">View</a> : "None"}</td>
                <td className="table-actions">
                  <select value={item.status} onChange={(e) => updateStatus(item.id, e.target.value)}>
                    <option value="PENDING">Pending</option>
                    <option value="REVIEWED">Reviewed</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                  <button type="button" className="danger-button" onClick={() => remove(item.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
