import { Navigate, useParams } from "react-router-dom";
import LeadershipProfileCard from "../../components/LeadershipProfileCard.jsx";
import Seo from "../../components/Seo.jsx";
import { leadershipProfiles } from "../../data/siteData.js";

const profilesByGroup = leadershipProfiles.reduce((groups, profile) => {
  if (!groups[profile.group]) groups[profile.group] = [];
  groups[profile.group].push(profile);
  return groups;
}, {});

const leadershipCategories = {
  executive: {
    group: "Executive Leadership",
    label: "Executive Leadership",
    title: "Executive Leadership",
    text: "Meet the executive officer providing the college's institutional vision, strategic direction, and commitment to academic excellence."
  },
  board: {
    group: "Board Members",
    label: "Governing Board",
    title: "Governing Board",
    text: "Council and board leaders providing governance, advisory strength, policy direction, and institutional oversight."
  },
  management: {
    group: "Management Staff",
    label: "Management Staff",
    title: "Management Staff",
    text: "Administrative, academic, assessment, student affairs, research, IT, and coordination officers supporting daily institutional service."
  },
  hods: {
    group: "Departmental HODs",
    label: "Heads of Departments (HODs)",
    title: "Heads of Departments",
    text: "Heads of department coordinating teaching, practical learning, welcome guidance, and student professional readiness."
  }
};

export default function Leadership() {
  const { category } = useParams();
  const selectedCategory = leadershipCategories[category];

  if (!selectedCategory) return <Navigate to="/leadership/executive" replace />;

  const selectedProfiles = profilesByGroup[selectedCategory.group] || [];

  return (
    <>
      <Seo
        title={`${selectedCategory.title} | Leadership`}
        description={`Meet the ${selectedCategory.title.toLowerCase()} of Unique College of Health Science and Technology.`}
      />
      <section className="page-hero compact leadership-hero">
        <span className="eyebrow">Leadership & Administration</span>
        <h1>{selectedCategory.title}</h1>
        <p>{selectedCategory.text}</p>
      </section>

      <section className="section leadership-directory-section">
        <div className="leadership-results" key={category}>
          <div className="leadership-results-heading">
            <div>
              <span className="eyebrow">Leadership Directory</span>
              <h2>Meet Our {selectedCategory.title}</h2>
              <p>Open any profile to read more about the officer's experience and responsibilities.</p>
            </div>
            <span className="leadership-result-count">
              {selectedProfiles.length} {selectedProfiles.length === 1 ? "profile" : "profiles"}
            </span>
          </div>
          <div className="leadership-grid">
            {selectedProfiles.map((profile) => (
              <LeadershipProfileCard profile={profile} key={`${profile.name}-${profile.role}`} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
