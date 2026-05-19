import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-screen">Checking session...</div>;
  if (!user) return <Navigate to="/admin/login" replace />;

  return children;
}
