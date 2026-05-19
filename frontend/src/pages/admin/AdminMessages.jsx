import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

export default function AdminMessages() {
  const [items, setItems] = useState([]);

  function load() {
    api.get("/contacts").then((res) => setItems(res.data.data));
  }

  useEffect(load, []);

  async function markRead(id) {
    await api.patch(`/contacts/${id}/read`);
    load();
  }

  return (
    <div className="admin-page">
      <header className="admin-header"><span className="eyebrow">Inbox</span><h1>Contact messages</h1></header>
      <div className="admin-list">
        {items.map((item) => (
          <article className="message-item" key={item.id}>
            <div>
              <strong>{item.subject}</strong>
              <span>{item.name} · {item.email}</span>
              <p>{item.message}</p>
            </div>
            {!item.isRead && <button type="button" onClick={() => markRead(item.id)}>Mark read</button>}
          </article>
        ))}
      </div>
    </div>
  );
}
