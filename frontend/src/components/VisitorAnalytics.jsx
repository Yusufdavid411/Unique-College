import { useEffect, useState } from "react";
import { RefreshCw, TrendingUp } from "lucide-react";
import { api, apiErrorMessage } from "../api/client.js";
import { ErrorToast } from "./ToastNotifications.jsx";

const formatNumber = (value) => Number(value || 0).toLocaleString("en-NG");
const formatDay = (value) => new Date(`${value}T12:00:00Z`).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });
const pageName = (path) => path === "/" ? "Home" : path;

function RankedViews({ title, entries = [], total = 0 }) {
  return <section className="analytics-panel"><h3>{title}</h3>{entries.length ? <ol className="analytics-ranking">{entries.map((entry) => <li key={entry.label}>
    <div><span>{pageName(entry.label)}</span><strong>{formatNumber(entry.views)}</strong></div>
    <span className="analytics-meter" aria-hidden="true"><span style={{ width: `${total ? Math.max(1, Math.round(entry.views / total * 100)) : 0}%` }} /></span>
  </li>)}</ol> : <p>No visits recorded in this period.</p>}</section>;
}

export default function VisitorAnalytics() {
  const [days, setDays] = useState(30);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    api.get("/analytics/summary", { params: { days }, signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setData(response.data.data); })
      .catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure, "Visitor analytics could not be loaded.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [days, revision]);
  const maximum = Math.max(1, ...(data?.daily || []).map((entry) => entry.pageViews));
  const total = data?.totals.pageViews || 0;

  return <section className="visitor-analytics" aria-labelledby="visitor-analytics-title" aria-busy={loading}>
    <header className="analytics-heading"><div><span className="eyebrow">Public website</span><h2 id="visitor-analytics-title"><TrendingUp size={24} />Visitor analytics</h2></div><div className="analytics-controls"><label>Period<select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label><button className="button secondary" type="button" disabled={loading} onClick={() => setRevision((value) => value + 1)}><RefreshCw size={16} />Refresh</button></div></header>
    {loading && <p role="status">Loading visitor analytics…</p>}
    <ErrorToast message={error} />
    {error && <p>Analytics could not load. Use Refresh to try again.</p>}
    {data && <>
      <div className="admin-stats analytics-stats">
        <article className="stat-card"><strong>{formatNumber(total)}</strong><span>Page views</span></article>
        <article className="stat-card"><strong>{formatNumber(data.totals.visitorDays)}</strong><span>Daily visitor estimates, summed</span></article>
        <article className="stat-card"><strong>{(total / days).toLocaleString("en-NG", { maximumFractionDigits: 1 })}</strong><span>Average page views per day</span></article>
      </div>
      <section className="analytics-panel"><h3>Daily traffic</h3><p className="analytics-caption">Blue: page views · Teal: daily visitor estimates · Africa/Lagos time</p>
        {total ? <div className="analytics-chart" role="img" aria-label={`Daily traffic for ${days} days: ${formatNumber(total)} page views. Expand the table below for daily figures.`}>{data.daily.map((entry) => <div className="analytics-chart-day" key={entry.date} title={`${formatDay(entry.date)}: ${entry.pageViews} views, ${entry.visitorDays} estimated visitors`}><span className="analytics-chart-view" style={{ height: `${entry.pageViews / maximum * 100}%` }} /><span className="analytics-chart-visitor" style={{ height: `${entry.visitorDays / maximum * 100}%` }} /></div>)}</div> : <div className="empty-state">No visits recorded yet. Traffic starts appearing as people browse the public website.</div>}
        <div className="analytics-chart-dates" aria-hidden="true"><span>{formatDay(data.daily[0].date)}</span><span>{formatDay(data.daily.at(-1).date)}</span></div>
        <details className="analytics-table"><summary>View daily figures</summary><div className="admin-table-wrap"><table><caption>Public website traffic by date</caption><thead><tr><th scope="col">Date</th><th scope="col">Page views</th><th scope="col">Visitor estimates</th></tr></thead><tbody>{data.daily.map((entry) => <tr key={entry.date}><th scope="row">{formatDay(entry.date)}</th><td>{formatNumber(entry.pageViews)}</td><td>{formatNumber(entry.visitorDays)}</td></tr>)}</tbody></table></div></details>
      </section>
      <div className="analytics-breakdowns"><RankedViews title="Popular pages" entries={data.pages} total={total} /><RankedViews title="Referring websites · views" entries={data.sources} total={total} /><RankedViews title="Devices · views" entries={data.devices} total={total} /></div>
      <details className="analytics-caption"><summary>How visitor estimates work</summary><p>Visitors are estimated from daily network/device identifiers. The same person returning on different days counts each day; shared networks can be grouped together. Bots, privacy settings and blocked requests affect totals. No private portal pages or visitor names are tracked.</p></details>
    </>}
  </section>;
}
