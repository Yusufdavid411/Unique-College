import { useState } from "react";
import { ChevronDown, UsersRound } from "lucide-react";
import LeadershipProfileCard from "../../components/LeadershipProfileCard.jsx";
import Seo from "../../components/Seo.jsx";
import { leadershipProfiles } from "../../data/siteData.js";

const profilesByGroup = leadershipProfiles.reduce((groups, profile) => {
  if (!groups[profile.group]) groups[profile.group] = [];
  groups[profile.group].push(profile);
  return groups;
}, {});

const leadershipCategories = [
  {
    value: "Executive Leadership",
    label: "Executive Leadership",
    title: "Executive Leadership",
    text: "Meet the executive officer responsible for the college's institutional vision and strategic direction."
  },
  {
    value: "Board Members",
    label: "Governing Board",
    title: "Board Members",
    text: "Council and board leaders providing governance, advisory strength, policy direction, and institutional oversight."
  },
  {
    value: "Management Staff",
    label: "Management Staff",
    title: "Management Staff",
    text: "Administrative, academic, assessment, student affairs, research, IT, and coordination officers supporting daily institutional service."
  },
  {
    value: "Departmental HODs",
    label: "Heads of Departments (HODs)",
    title: "Heads of Departments",
    text: "Heads of department coordinating teaching, practical learning, welcome guidance, and student professional readiness."
  }
];

export default function Leadership() {
  const [selectedGroup, setSelectedGroup] = useState("");
  const selectedCategory = leadershipCategories.find((category) => category.value === selectedGroup);
  const selectedProfiles = selectedGroup ? profilesByGroup[selectedGroup] || [] : [];

  return (
    <>
      <Seo
        title="Leadership"
        description="Meet the leadership, governing council, management staff, and academic heads of Unique College of Health Science and Technology."
      />
      <section className="page-hero compact leadership-hero">
        <span className="eyebrow">Leadership & Administration</span>
        <h1>The Principal Officers</h1>
        <p>Our leadership team brings together governance, administration, academic supervision, and professional health science experience.</p>
      </section>

      <section className="section leadership-directory-section">
        <div className="leadership-toolbar">
          <div>
            <span className="eyebrow">Leadership Directory</span>
            <h2>Choose Who You Want To Meet</h2>
            <p>Select one category to see only the leaders relevant to your search.</p>
          </div>
          <label className="leadership-select-field" htmlFor="leadership-category">
            <span>Leadership category</span>
            <div className="leadership-select-control">
              <UsersRound size={20} aria-hidden="true" />
              <select
                id="leadership-category"
                value={selectedGroup}
                onChange={(event) => setSelectedGroup(event.target.value)}
              >
                <option value="">Select a category</option>
                {leadershipCategories.map((category) => (
                  <option value={category.value} key={category.value}>
                    {category.label} ({profilesByGroup[category.value]?.length || 0})
                  </option>
                ))}
              </select>
              <ChevronDown size={20} aria-hidden="true" />
            </div>
          </label>
        </div>

        {!selectedCategory && (
          <div className="leadership-empty-state">
            <UsersRound size={34} aria-hidden="true" />
            <h3>Select a leadership category</h3>
            <p>Choose Executive Leadership, Governing Board, Management Staff, or Heads of Departments from the dropdown.</p>
          </div>
        )}

        {selectedCategory && (
          <div className="leadership-results" key={selectedCategory.value}>
            <div className="leadership-results-heading" aria-live="polite">
              <div>
                <span className="eyebrow">{selectedCategory.label}</span>
                <h2>{selectedCategory.title}</h2>
                <p>{selectedCategory.text}</p>
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
        )}
      </section>
    </>
  );
}
