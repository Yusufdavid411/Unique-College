export default function AdminNotice({ type = "info", children }) {
  if (!children) return null;
  return <p className={`admin-notice ${type}`}>{children}</p>;
}
