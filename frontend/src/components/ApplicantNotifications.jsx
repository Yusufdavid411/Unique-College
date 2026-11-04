import { Bell } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApplicant } from "../context/ApplicantContext.jsx";

export default function ApplicantNotifications() {
  const { application } = useApplicant();
  return <NotificationPanel key={application?.id || "loading"} application={application} />;
}

function NotificationPanel({ application }) {
  const panel = useRef(null);
  const storageKey = application?.id ? `unique_college_notifications_read:${application.id}` : null;
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    if (!storageKey) return [];
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return Array.isArray(saved) ? saved : [];
    } catch { return []; }
  });
  const events = useMemo(() => (application?.statusHistory || []).filter((event) => event.notificationText).slice(0, 20), [application?.statusHistory]);
  const unreadCount = events.filter((event) => !readIds.includes(event.id)).length;
  useEffect(() => {
    if (!open || !unreadCount) return;
    const seen = events.map((event) => event.id);
    setReadIds(seen);
    if (storageKey) {
      try { localStorage.setItem(storageKey, JSON.stringify(seen)); } catch {}
    }
  }, [open, unreadCount, events, storageKey]);
  useEffect(() => {
    function dismissOutside(event) {
      if (panel.current?.open && !panel.current.contains(event.target)) panel.current.open = false;
    }
    function dismissOnEscape(event) {
      if (event.key !== "Escape" || !panel.current?.open) return;
      panel.current.open = false;
      panel.current.querySelector("summary")?.focus();
    }
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, []);
  return <details ref={panel} className="applicant-notifications" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className={unreadCount ? "notification-trigger has-unread" : "notification-trigger"} aria-label={unreadCount ? `Admissions notifications (${unreadCount} unread)` : "Admissions notifications"}><Bell size={25} className="notification-bell" aria-hidden="true" />{unreadCount > 0 && <span className="notification-count" aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span>}</summary>
    <section className="applicant-notification-panel" aria-label="Admissions notifications">
      <h2>Notifications</h2>
      {events.length ? events.map((event) => <article key={event.id}>
        <h3>{event.notificationSubject || "Admissions update"}</h3>
        <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })} (WAT)</time>
        <p>{event.notificationText}</p>
      </article>) : <p>No admissions notifications yet.</p>}
    </section>
  </details>;
}
