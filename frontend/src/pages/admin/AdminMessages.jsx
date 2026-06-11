import { useEffect, useState } from "react";
import AdminNotice from "../../components/AdminNotice.jsx";
import LoadingButton from "../../components/LoadingButton.jsx";
import { api, apiErrorMessage } from "../../api/client.js";

export default function AdminMessages() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });

  function load() {
    setLoading(true);
    api
      .get("/contacts")
      .then((res) => setItems(res.data.data))
      .catch((error) => setNotice({ type: "error", message: apiErrorMessage(error, "Messages could not be loaded.") }))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function markRead(id) {
    setBusyId(id);
    setNotice({ type: "", message: "" });
    try {
      await api.patch(`/contacts/${id}/read`);
      setNotice({ type: "success", message: "Message marked as read." });
      load();
    } catch (error) {
      setNotice({ type: "error", message: apiErrorMessage(error, "Message could not be updated.") });
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header"><span className="eyebrow">Inbox</span><h1>Contact messages</h1></header>
      <AdminNotice type={notice.type}>{notice.message}</AdminNotice>
      <div className="admin-list">
        {loading && <div className="empty-state">Loading messages...</div>}
        {!loading && !items.length && <div className="empty-state">No contact messages yet.</div>}
        {!loading && items.map((item) => (
          <article className="message-item" key={item.id}>
            <div>
              <strong>{item.subject}</strong>
              <span>{item.name} - {item.email}</span>
              <p>{item.message}</p>
            </div>
            {!item.isRead && (
              <LoadingButton className="list-button" loading={busyId === item.id} loadingText="Saving..." onClick={() => markRead(item.id)}>
                Mark read
              </LoadingButton>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
