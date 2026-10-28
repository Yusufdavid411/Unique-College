import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Images, LayoutDashboard, LogOut, Menu, MessageSquare, Newspaper, Settings, Users, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { assetPaths } from "../data/siteData.js";
import { portalPath } from "../api/portalLinks.js";

const items = [
  ["Overview", "/admin", LayoutDashboard],
  ["Applications", "/admin/applications", Users],
  ["News", "/admin/news", Newspaper],
  ["Events", "/admin/events", LayoutDashboard],
  ["Gallery", "/admin/gallery", Images],
  ["Messages", "/admin/messages", MessageSquare],
  ["Settings", "/admin/settings", Settings],
  ["Roles", "/admin/roles", Users],
  ["Staff accounts", "/admin/users", Users],
  ["Audit history", "/admin/audit", LayoutDashboard],
  ["Account security", "/admin/security", Settings]
];

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate(portalPath("/admin/login"));
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar${menuOpen ? " mobile-menu-open" : ""}`}>
        <div className="admin-brand">
          <img src={assetPaths.logo} alt="Unique College logo" />
          <div>
            <strong>Unique College</strong>
            <span>{user?.name}</span>
          </div>
        </div>
        <button className="admin-menu-toggle" type="button" aria-label={menuOpen ? "Close admin navigation" : "Open admin navigation"} aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        <nav id="admin-navigation" aria-label="Admin navigation">
          {items.map(([label, path, Icon]) => (
            <NavLink key={path} to={portalPath(path)} end={path === "/admin"} onClick={() => setMenuOpen(false)}>
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
