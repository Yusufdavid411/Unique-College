import { useEffect, useState } from "react";
import { api } from "../../api/client.js";
import Seo from "../../components/Seo.jsx";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [state, setState] = useState("loading");
  useEffect(() => {
    api.get("/events/public").then((response) => { setEvents(response.data.data); setState("ready"); }).catch(() => setState("error"));
  }, []);
  return <><Seo title="Events" description="School events and activities at Unique College." /><section className="page-hero compact"><span className="eyebrow">Campus life</span><h1>Events at Unique College</h1></section><section className="section"><div className="cards-grid">{state === "loading" && <p>Loading events…</p>}{state === "error" && <p role="alert">Events could not be loaded. Please try again shortly.</p>}{state === "ready" && !events.length && <p>New events will be announced here.</p>}{events.map((event) => <article className="program-card" key={event.id}><span className="eyebrow">{new Date(event.endsAt) < new Date() ? "Past event" : "Coming up"}</span><h2>{event.title}</h2><p><time dateTime={event.startsAt}>{new Date(event.startsAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</time> WAT</p><p>{event.location}</p><details><summary>Event details</summary><p style={{ whiteSpace: "pre-wrap" }}>{event.description}</p></details></article>)}</div></section></>;
}
