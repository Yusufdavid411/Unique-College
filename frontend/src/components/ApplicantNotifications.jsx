import { Bell } from "lucide-react";
import { useEffect, useRef } from "react";
import { useApplicant } from "../context/ApplicantContext.jsx";

export default function ApplicantNotifications() {
  const { application } = useApplicant();
  const panel = useRef(null);
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
  const events = (application?.statusHistory || []).filter((event) => event.notificationText).slice(0, 20);
  return <details ref={panel} className="applicant-notifications">
    <summary aria-label={`Admissions notifications (${events.length} recent)`}><Bell size={21} aria-hidden="true" />{events.length > 0 && <span aria-hidden="true">{events.length}</span>}</summary>
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
