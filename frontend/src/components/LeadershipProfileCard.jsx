import { Award, BriefcaseBusiness, ChevronDown, Maximize2 } from "lucide-react";

function createPreview(summary, maxLength = 110) {
  if (summary.length <= maxLength) return summary;

  const shortened = summary.slice(0, maxLength).replace(/\s+\S*$/, "");
  return `${shortened}…`;
}

export default function LeadershipProfileCard({ profile, onOpenPortrait }) {
  return (
    <article className="leadership-card">
      <button
        className="leadership-image-button"
        type="button"
        onClick={onOpenPortrait}
        aria-label={`View full portrait of ${profile.name}`}
      >
        <span
          className="leadership-image-backdrop"
          style={{ backgroundImage: `url(${profile.image})` }}
          aria-hidden="true"
        />
        <img src={profile.image} alt={profile.name} loading="lazy" />
        <span className="leadership-image-action"><Maximize2 size={16} />View portrait</span>
      </button>
      <div className="leadership-card-body">
        <span className="leadership-tag"><BriefcaseBusiness size={15} />{profile.group}</span>
        <h3>{profile.name}</h3>
        <strong>{profile.role}</strong>
        <p className="leadership-card-preview">{createPreview(profile.summary)}</p>

        <details className="leadership-details">
          <summary>
            <span>View full profile</span>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>
          <div className="leadership-details-content">
            <p>{profile.summary}</p>
            <h4>Profile highlights</h4>
            <ul>
              {profile.achievements.map((achievement) => (
                <li key={achievement}><Award size={16} />{achievement}</li>
              ))}
            </ul>
          </div>
        </details>
      </div>
    </article>
  );
}
