import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client.js";
import { portalPath } from "../api/portalLinks.js";
import PasswordInput from "./PasswordInput.jsx";
import LoadingButton from "./LoadingButton.jsx";
import Seo from "./Seo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export function SendPasswordReset({ applicationId }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function send(event) {
    event.preventDefault();
    if (busy) return;
    const address = new FormData(event.currentTarget).get("email");
    setBusy(true); setNotice("");
    try {
      const response = applicationId ? await api.post(`/applications/${applicationId}/account/reset-link`, undefined, { notifyOnError: false }) : await api.post("/auth/send-password-reset", { email: address });
      setNotice(response.data.message);
    } catch (error) {
      if (applicationId) setNotice(error.response?.data?.code === "RESET_EMAIL_NOT_CONFIGURED" ? "Reset email is not configured. Set up Resend before sending a reset link." : apiErrorMessage(error));
    } finally { setBusy(false); }
  }
  if (user?.role !== "ADMIN" && !user?.permissions?.includes("users.manage")) return null;
  return <form className="form-panel" onSubmit={send}>{!applicationId && <><h2>Send password-reset link</h2><p>Enter the registered email of an applicant, student or staff member. They will choose their own password securely.</p><label>Registered email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label></>}<LoadingButton type="submit" loading={busy}>Send reset link</LoadingButton>{notice && <p role="status">{notice}</p>}</form>;
}

export default function PasswordRecovery({ reset = false, scope = "applicant" }) {
  const { logout } = useAuth();
  const [token] = useState(() => {
    if (!reset) return "";
    const value = window.location.hash.slice(1);
    return value;
  });
  useEffect(() => { if (reset) window.history.replaceState(null, "", window.location.pathname); }, [reset]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [done, setDone] = useState(false);
  const login = portalPath(`/${scope}/login`);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    if (reset && fields.get("password") !== fields.get("confirmation")) { setNotice("The passwords do not match."); return; }
    setBusy(true); setNotice("");
    try {
      const response = await api.post(reset ? "/auth/reset-password" : "/auth/forgot-password", reset ? { token, password: fields.get("password") } : { email: fields.get("email") });
      if (reset) logout();
      setNotice(response.data.message); setDone(true);
      event.target.reset();
    } catch {} finally { setBusy(false); }
  }
  return <main className="login-screen"><Seo title={reset ? "Reset password" : "Forgot password"} description="Secure Unique College account recovery." /><section className="login-panel"><span className="eyebrow">Account recovery</span><h1>{reset ? "Choose a new password" : "Forgot password?"}</h1>{!done && <form onSubmit={submit}>{reset ? <><p>Use at least 12 characters with uppercase, lowercase and a number.</p><label>New password<PasswordInput name="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label><label>Confirm password<PasswordInput name="confirmation" autoComplete="new-password" minLength={12} maxLength={72} required /></label></> : <><p>Enter your registered email. We’ll email you a secure reset link.</p><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label></>}<LoadingButton type="submit" loading={busy}>{reset ? "Reset password" : "Send reset link"}</LoadingButton></form>}{notice && <p role="status">{notice}</p>}<Link to={login}>Back to sign in</Link>{reset && <Link to={portalPath(`/${scope}/forgot-password`)}>Request a new reset link</Link>}</section></main>;
}
