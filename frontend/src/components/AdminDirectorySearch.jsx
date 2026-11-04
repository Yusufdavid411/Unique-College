export function matchesDirectorySearch(query, ...fields) {
  const searchable = fields.filter(Boolean).join(" ").toLowerCase();
  return query.trim().toLowerCase().split(/\s+/).every((word) => searchable.includes(word));
}

export default function AdminDirectorySearch({ label, placeholder, value, onChange, onSearch, disabled = false }) {
  const field = <label>{label}<input type="search" value={value} maxLength={100} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} /></label>;
  return onSearch
    ? <form className="student-search" role="search" aria-label={label} onSubmit={(event) => { event.preventDefault(); onSearch(value.trim()); }}>{field}<button type="submit" className="button primary" disabled={disabled}>Search</button></form>
    : <div className="student-search" role="search" aria-label={label}>{field}</div>;
}
