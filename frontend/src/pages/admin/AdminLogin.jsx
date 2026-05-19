import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Seo from "../../components/Seo.jsx";

export default function AdminLogin() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  if (user) return <Navigate to="/admin" replace />;

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await login(form.email, form.password);
      navigate("/admin");
    } catch {
      setError("Invalid admin credentials.");
    }
  }

  return (
    <main className="login-screen">
      <Seo title="Admin Login" description="Secure admin login for Unique College." />
      <form className="login-panel" onSubmit={submit}>
        <span className="eyebrow">Admin system</span>
        <h1>Unique College</h1>
        <input required type="email" placeholder="Admin email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="button primary" type="submit">Sign in</button>
        {error && <p className="form-status error">{error}</p>}
      </form>
    </main>
  );
}
