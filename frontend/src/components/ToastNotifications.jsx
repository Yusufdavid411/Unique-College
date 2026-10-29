import { useEffect, useState, useSyncExternalStore } from "react";
import { CircleAlert, Info, X } from "lucide-react";
import { dismissNotification, getNotifications, notify, reportUnexpectedError, subscribeNotifications } from "../api/notifications.js";

function Toast({ notification }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => dismissNotification(notification.id), 10000);
    return () => window.clearTimeout(timer);
  }, [notification.id, paused]);
  return <article className={`toast-message toast-message--${notification.type}`} role={notification.type === "error" ? "alert" : "status"} onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    {notification.type === "error" ? <CircleAlert size={22} aria-hidden="true" /> : <Info size={22} aria-hidden="true" />}
    <div><strong>{notification.title}</strong><p>{notification.message}</p></div>
    <button type="button" aria-label="Dismiss notification" onClick={() => dismissNotification(notification.id)}><X size={18} /></button>
  </article>;
}

export function ErrorToast({ message, incident }) {
  useEffect(() => { if (typeof message === "string") notify({ title: "Please check this step", message }); }, [message, incident]);
  return null;
}

export default function ToastNotifications() {
  const notifications = useSyncExternalStore(subscribeNotifications, getNotifications, getNotifications);
  useEffect(() => {
    const unexpected = (event) => { if (event.error || event.message) reportUnexpectedError(event.error); };
    const rejection = (event) => reportUnexpectedError(event.reason);
    const offline = () => notify({ title: "You're offline", message: "Your device has no internet connection. Reconnect, then try again." });
    const online = () => { for (const notification of getNotifications()) if (notification.title === "You're offline") dismissNotification(notification.id); notify({ title: "Connection restored", message: "You're back online. Check the latest status before continuing.", type: "info" }); };
    const invalid = (event) => {
      const field = event.target;
      if (field?.validationMessage) notify({ title: "Please check your entries", message: field.validationMessage });
    };
    window.addEventListener("error", unexpected);
    window.addEventListener("unhandledrejection", rejection);
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    document.addEventListener("invalid", invalid, true);
    return () => { window.removeEventListener("error", unexpected); window.removeEventListener("unhandledrejection", rejection); window.removeEventListener("offline", offline); window.removeEventListener("online", online); document.removeEventListener("invalid", invalid, true); };
  }, []);
  return <aside className="toast-region no-print" aria-label="Notifications">{notifications.map((notification) => <Toast key={notification.id} notification={notification} />)}</aside>;
}
