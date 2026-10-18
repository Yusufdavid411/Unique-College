import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, roles = [], redirectTo = "/admin/login" }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-screen">Checking session...</div>;
  if (!user || (roles.length && !roles.includes(user.role))) return <Navigate to={redirectTo} replace />;

  return children;
}
