import { ErrorToast } from "./ToastNotifications.jsx";

export default function AdminNotice({ type = "info", children }) {
  if (!children) return null;
  if (type === "error" && typeof children === "string") return <ErrorToast message={children} />;
  return <p className={`admin-notice ${type}`}>{children}</p>;
}
