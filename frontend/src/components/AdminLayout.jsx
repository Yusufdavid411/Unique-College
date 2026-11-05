import { Outlet } from "react-router-dom";
import { Images, LayoutDashboard, MessageSquare, Newspaper, Settings, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import PortalShell from "./PortalShell.jsx";

const items = [
  ["Overview", "/admin", LayoutDashboard],
  ["Applications", "/admin/applications", Users],
  ["Screening & exams", "/admin/screening", LayoutDashboard, "applications.review"],
  ["Students", "/admin/students", Users, "students.read"],
  ["Academic setup", "/admin/academic", LayoutDashboard, "academic.manage"],
  ["Announcements", "/admin/announcements", MessageSquare, "announcements.manage"],
  ["News", "/admin/news", Newspaper],
  ["Events", "/admin/events", LayoutDashboard],
  ["Gallery", "/admin/gallery", Images],
  ["Messages", "/admin/messages", MessageSquare],
  ["Settings", "/admin/settings", Settings],
  ["Roles", "/admin/roles", Users],
  ["Staff accounts", "/admin/users", Users],
  ["Audit history", "/admin/audit", LayoutDashboard]
];

export default function AdminLayout() {
  const { user } = useAuth();
  const links = items.filter(([, , , permission]) => !permission || user?.role === "ADMIN" || user?.permissions?.includes(permission));
  return <PortalShell title="Administration" accountScope="admin" links={links} profilePath="/admin/settings" profileLabel="Open settings"><Outlet /></PortalShell>;
}
