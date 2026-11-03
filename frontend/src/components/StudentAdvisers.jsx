import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function StudentAdvisers() {
  const [records, setRecords] = useState(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { const controller = new AbortController(); setFailed(false); api.get("/student/advisers", { signal: controller.signal }).then((response) => setRecords(response.data.data)).catch((error) => { if (error.code !== "ERR_CANCELED") setFailed(true); }); return () => controller.abort(); }, [revision]);
  return <section className="student-card"><h2>My academic advisers</h2>{!records ? <p>{failed ? "Adviser information could not be loaded." : "Loading advisers…"}</p> : !records.length ? <p>The registry has not assigned an academic adviser yet.</p> : records.map((record) => <article key={record.id}><strong>{record.staff.name}</strong><p>{record.enrolment.programme.name} · {record.enrolment.session.name}</p><p>{record.staff.email}</p></article>)}{failed && <button className="button secondary" onClick={() => setRevision((value) => value + 1)}>Try again</button>}</section>;
}
