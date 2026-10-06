import { Award, BriefcaseBusiness, CheckCircle2 } from "lucide-react";
import Seo from "../../components/Seo.jsx";
import { leadershipProfiles, schoolInfo } from "../../data/siteData.js";

const featuredProfile = leadershipProfiles[0];
const groupedProfiles = leadershipProfiles.slice(1).reduce((groups, profile) => {
  if (!groups[profile.group]) groups[profile.group] = [];
  groups[profile.group].push(profile);
  return groups;
}, {});

export default function Leadership() {
  return (
    <>
      <Seo
        title="Leadership"
        description="Meet the leadership, governing council, management staff, and academic heads of Unique College of Health Science and Technology."
      />
      <section className="page-hero compact leadership-hero">
        <span className="eyebrow">Leadership & Administration</span>
        <h1>Meet the people guiding {schoolInfo.shortName}.</h1>
        <p>Our leadership team brings together governance, administration, academic supervision, and professional health science experience.</p>
      </section>

      <section className="section leadership-feature">
        <div className="leadership-feature-image">
          <img src={featuredProfile.image} alt={featuredProfile.name} loading="lazy" />
        </div>
        <div className="leadership-feature-copy">
          <span className="eyebrow">{featuredProfile.group}</span>
          <h2>{featuredProfile.name}</h2>
          <strong>{featuredProfile.role}</strong>
          <p>{featuredProfile.summary}</p>
          <div className="leader-points">
            {featuredProfile.achievements.map((achievement) => (
              <span key={achievement}><CheckCircle2 size={20} />{achievement}</span>
            ))}
          </div>
        </div>
      </section>

      {Object.entries(groupedProfiles).map(([group, profiles]) => (
        <section className="section leadership-group-section" key={group}>
          <div className="section-heading">
            <span className="eyebrow">{group}</span>
            <h2>{group === "Academic Leadership" ? "Departmental academic heads" : "Institutional leadership"}</h2>
          </div>
          <div className="leadership-grid">
            {profiles.map((profile) => (
              <article className="leadership-card" key={`${profile.name}-${profile.role}`}>
                <img src={profile.image} alt={profile.name} loading="lazy" />
                <div className="leadership-card-body">
                  <span className="leadership-tag"><BriefcaseBusiness size={15} />{profile.group}</span>
                  <h3>{profile.name}</h3>
                  <strong>{profile.role}</strong>
                  <p>{profile.summary}</p>
                  <ul>
                    {profile.achievements.map((achievement) => (
                      <li key={achievement}><Award size={16} />{achievement}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
