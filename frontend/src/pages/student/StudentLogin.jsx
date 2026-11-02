import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSchool } from "../../context/SchoolContext.jsx";
import { portalPath, applicationHref, publicPageHref } from "../../api/portalLinks.js";
import { apiErrorMessage } from "../../api/client.js";
import PasswordInput from "../../components/PasswordInput.jsx";
import LoadingButton from "../../components/LoadingButton.jsx";
import { ErrorToast } from "../../components/ToastNotifications.jsx";
import { assetPaths } from "../../data/siteData.js";

export default function StudentLogin() {
  const { user, studentLogin } = useAuth();
  const { schoolInfo } = useSchool();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (user?.role === "STUDENT") return <Navigate to={portalPath("/student")} replace />;
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try { await studentLogin(fields.get("identifier"), fields.get("password")); navigate(portalPath("/student"), { replace: true }); }
    catch (failure) { setError(apiErrorMessage(failure, "Sign-in could not be completed.")); }
    finally { setBusy(false); }
  }
  return <main className="student-access"><section className="student-access-intro"><img src={assetPaths.logo} alt="Unique College logo" /><span className="eyebrow">{schoolInfo.shortName}</span><h1>Your studies.<br />One student account.</h1><p>Keep your details current, check your academic record and access your documents in one place.</p><a href={publicPageHref("/", window.location.hostname)}>Return to school website</a></section><section className="student-access-card"><span className="eyebrow">Student portal</span><h2>Welcome back</h2><p>Use your existing email or assigned student username. No new registration is required.</p><form onSubmit={submit}><label>Email or student username<input name="identifier" autoComplete="username" maxLength={254} required /></label><label>Password<PasswordInput name="password" label="student password" autoComplete="current-password" required /></label><ErrorToast message={error} /><LoadingButton className="button" type="submit" loading={busy} disabled={busy} loadingText="Signing in…">Sign in</LoadingButton></form><details><summary>Still applying?</summary><p>Student access starts after final admission. Continue your application, payment and clearance in the applicant portal.</p><a href={applicationHref()}>Open applicant portal</a></details></section></main>;
}
