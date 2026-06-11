import { useEffect, useState } from "react";
import AdminNotice from "../../components/AdminNotice.jsx";
import { api, apiErrorMessage } from "../../api/client.js";

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api
      .get("/dashboard/stats")
      .then((res) => setStats(res.data.data))
      .catch((error) => setNotice(apiErrorMessage(error, "Dashboard stats could not be loaded.")))
      .finally(() => setLoading(false));
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
      <AdminNotice type="error">{notice}</AdminNotice>
      <div className="admin-stats">
        {items.map(([label, value]) => (
          <article className="stat-card" key={label}><strong>{loading ? "..." : value}</strong><span>{label}</span></article>
        ))}
      </div>
    </div>
  );
}
