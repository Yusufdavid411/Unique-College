import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Seo from "../../components/Seo.jsx";
import LoadingButton from "../../components/LoadingButton.jsx";
import PasswordInput from "../../components/PasswordInput.jsx";
import { reportUnexpectedError } from "../../api/notifications.js";
import { portalPath } from "../../api/portalLinks.js";

export default function AdminLogin() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={portalPath("/admin")} replace />;

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate(portalPath("/admin"));
    } catch (error) {
      reportUnexpectedError(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <Seo title="Admin Login" description="Secure admin login for Unique College." />
      <form className="login-panel" onSubmit={submit}>
        <span className="eyebrow">Admin system</span>
        <h1>Unique College</h1>
        <input required type="email" placeholder="Admin email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <PasswordInput required name="password" autoComplete="current-password" aria-label="Password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <LoadingButton type="submit" loading={submitting} loadingText="Signing in...">Sign in</LoadingButton>
      </form>
    </main>
  );
}
