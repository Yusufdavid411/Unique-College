import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Images, LayoutDashboard, LogOut, MessageSquare, Newspaper, Settings, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { assetPaths } from "../data/siteData.js";

const items = [
  ["Overview", "/admin", LayoutDashboard],
  ["Applications", "/admin/applications", Users],
  ["News", "/admin/news", Newspaper],
  ["Gallery", "/admin/gallery", Images],
  ["Messages", "/admin/messages", MessageSquare],
  ["Settings", "/admin/settings", Settings]
];

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/admin/login");
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src={assetPaths.logo} alt="Unique College logo" />
          <div>
            <strong>Unique College</strong>
            <span>{user?.name}</span>
          </div>
        </div>
        <nav>
          {items.map(([label, path, Icon]) => (
            <NavLink key={path} to={path} end={path === "/admin"}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="sidebar-logout" type="button" onClick={handleLogout}>
          <LogOut size={18} />
          Sign out
        </button>
      </aside>
      <section className="admin-main">
        <Outlet />
      </section>
    </div>
  );
}
