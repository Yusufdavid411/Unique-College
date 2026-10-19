import { useState } from "react";
import { api, apiErrorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function ChangePassword() {
  const { logout } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    if (values.get("password") !== values.get("confirmation")) return setError("Passwords do not match.");
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/password", { currentPassword: values.get("currentPassword"), password: values.get("password") });
      logout();
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }
  return <main className="section"><form className="form-panel" onSubmit={submit}><h1>Secure your account</h1><p>Change your temporary password, then sign in again.</p><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label><label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label><p>Use at least 12 characters including uppercase, lowercase, and a number.</p><label>Confirm password<input name="confirmation" type="password" autoComplete="new-password" required /></label>{error && <p role="alert">{error}</p>}<button className="button" type="submit" disabled={busy}>{busy ? "Updating…" : "Change password"}</button><button type="button" onClick={logout}>Sign out</button></form></main>;
}
