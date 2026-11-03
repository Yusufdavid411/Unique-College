import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { portalPath, publicPageHref } from "../../api/portalLinks.js";
import PasswordInput from "../../components/PasswordInput.jsx";
import LoadingButton from "../../components/LoadingButton.jsx";
import Seo from "../../components/Seo.jsx";
import { assetPaths } from "../../data/siteData.js";

export default function StaffLogin() {
  const { user, staffLogin } = useAuth();
  const [busy, setBusy] = useState(false);
  if (user?.role === "STAFF") return <Navigate to={portalPath("/staff")} replace />;
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    try { await staffLogin(values.get("email"), values.get("password")); }
    catch {} finally { setBusy(false); }
  }
  return <main className="student-access"><Seo title="Staff portal" description="Unique College staff and faculty access." /><section className="student-access-intro"><img src={assetPaths.logo} alt="Unique College logo" /><span className="eyebrow">Staff & faculty</span><h1>Your work.<br />One secure workspace.</h1><p>Access your assigned students and institutional responsibilities.</p><a href={publicPageHref("/", window.location.hostname)}>School website</a></section><section className="student-access-card"><span className="eyebrow">Staff portal</span><h2>Welcome back</h2><p>Use the account issued by the school administrator. Staff accounts cannot be self-registered.</p><form onSubmit={submit}><label>Registered email<input name="email" type="email" autoComplete="username" maxLength={254} required /></label><label>Password<PasswordInput name="password" autoComplete="current-password" required /></label><LoadingButton type="submit" loading={busy}>Sign in</LoadingButton></form><Link to={portalPath("/staff/forgot-password")}>Forgot password?</Link></section></main>;
}
