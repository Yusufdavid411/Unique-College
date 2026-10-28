import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ChangePassword from "./ChangePassword.jsx";
import { portalPath } from "../api/portalLinks.js";

export default function ProtectedRoute({ children, roles = [], redirectTo = "/admin/login", entry = null }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) return <div className="loading-screen">Checking session...</div>;
  if (!user || (roles.length && !roles.includes(user.role))) {
    if (entry && pathname === "/") return entry;
    return <Navigate to={portalPath(redirectTo)} replace />;
  }

  return user.mustChangePassword ? <ChangePassword /> : children;
}
