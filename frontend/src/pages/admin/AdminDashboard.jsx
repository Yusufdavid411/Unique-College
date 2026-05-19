import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

export default function AdminDashboard() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    api.get("/dashboard/stats").then((res) => setStats(res.data.data));
  }, []);

  const items = [
    ["Applications", stats.applications || 0],
    ["Pending review", stats.pendingApplications || 0],
    ["Accepted", stats.acceptedApplications || 0],
    ["News items", stats.newsItems || 0],
    ["Gallery items", stats.galleryItems || 0],
    ["Unread messages", stats.unreadMessages || 0]
  ];

  return (
    <div className="admin-page">
      <header className="admin-header"><span className="eyebrow">Dashboard</span><h1>Overview</h1></header>
      <div className="admin-stats">
        {items.map(([label, value]) => (
          <article className="stat-card" key={label}><strong>{value}</strong><span>{label}</span></article>
        ))}
      </div>
    </div>
  );
}
