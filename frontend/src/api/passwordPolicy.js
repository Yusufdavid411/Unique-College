export function passwordValidationMessage(password) {
  if (password.length < 12) return "Use at least 12 characters for your new password.";
  if (password.length > 72 || new TextEncoder().encode(password).length > 72) return "Your new password is too long. Please shorten it.";
  if (!/[A-Z]/.test(password)) return "Add at least one uppercase letter (A-Z) to your new password.";
  if (!/[a-z]/.test(password)) return "Add at least one lowercase letter (a-z) to your new password.";
  if (!/[0-9]/.test(password)) return "Add at least one number (0-9) to your new password.";
  return "";
}
