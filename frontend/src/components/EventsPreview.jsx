import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import ResponsiveCarousel from "./ResponsiveCarousel.jsx";

export default function EventsPreview() {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    api.get("/events/public").then((response) => setEvents(response.data.data.filter((event) => new Date(event.endsAt) >= new Date()).sort((first, second) => new Date(first.startsAt) - new Date(second.startsAt)).slice(0, 3))).catch(() => setEvents([]));
  }, []);
  if (!events.length) return null;
  return <section className="section"><div className="section-heading"><span className="eyebrow">Campus calendar</span><h2>Coming up at Unique College</h2></div><ResponsiveCarousel items={events} getKey={(event) => event.id} ariaLabel="Upcoming events" renderItem={(event) => <article className="program-card"><span className="eyebrow">{new Date(event.startsAt).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" })}</span><h3>{event.title}</h3><p>{event.location}</p><Link to="/events">See event details</Link></article>} /><div className="section-action"><Link className="button secondary" to="/events">View all events</Link></div></section>;
}
