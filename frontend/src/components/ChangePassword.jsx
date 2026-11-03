import { useState } from "react";
import { api, apiErrorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import PasswordInput from "./PasswordInput.jsx";
import { ErrorToast } from "./ToastNotifications.jsx";
import { notify } from "../api/notifications.js";
import { passwordValidationMessage } from "../api/passwordPolicy.js";

export default function ChangePassword({ embedded = false }) {
  const { logout, user } = useAuth();
  const activating = user?.role === "STUDENT" && user.mustChangePassword;
  const activatingStaff = user?.role === "STAFF" && user.mustChangePassword;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const passwordIssue = passwordValidationMessage(String(values.get("password") || ""));
    if (passwordIssue) { event.currentTarget.elements.namedItem("password")?.focus(); return notify({ title: "Check your new password", message: passwordIssue }); }
    if (values.get("password") !== values.get("confirmation")) return notify({ title: "Check your new password", message: "Passwords do not match. Enter the same new password in both fields." });
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/password", { currentPassword: values.get("currentPassword"), password: values.get("password") });
      notify({ title: "Password changed", message: "Sign in again using your new password.", type: "info" });
      logout();
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }
  const Container = embedded ? "section" : "main";
  const Heading = embedded ? "h2" : "h1";
  return <Container className={embedded ? "settings-security" : "section"}>
    <form className="form-panel" onSubmit={submit}>
      <Heading>{activating ? "Activate student access" : activatingStaff ? "Activate staff access" : "Account security"}</Heading><p>{activating ? "Enter your existing applicant password and choose a new password to activate student access. Then sign in again." : activatingStaff ? "Your temporary password was accepted. Enter it below and choose your own password before opening the staff dashboard. Then sign in again." : "After changing your password, sign in again with the new password."}</p>
      <label>Current password<PasswordInput label="current password" name="currentPassword" autoComplete="current-password" required /></label>
      <label>New password<PasswordInput label="new password" name="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label>
      <p>Use at least 12 characters including uppercase, lowercase, and a number.</p>
      <label>Confirm password<PasswordInput label="confirmation password" name="confirmation" autoComplete="new-password" required /></label>
      <ErrorToast message={error} />
      <button className="button" type="submit" disabled={busy}>{busy ? "Updating…" : "Change password"}</button><button type="button" onClick={logout}>Sign out</button>
    </form>
  </Container>;
}
