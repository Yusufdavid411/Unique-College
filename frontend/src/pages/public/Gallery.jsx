import { useEffect, useState } from "react";
import Seo from "../../components/Seo.jsx";
import { api, assetUrl } from "../../api/client.js";
import { assetPaths } from "../../data/siteData.js";

const officialGallery = [
  ["Classroom learning", "Campus life", assetPaths.campusWide],
  ["Campus facilities", "Campus", assetPaths.campusContact],
  ["Admission programmes", "Admissions", assetPaths.admissionFlyer]
];

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenIds, setHiddenIds] = useState([]);

  useEffect(() => {
    api
      .get("/gallery/public")
      .then((res) => setItems(res.data.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const visibleItems = items.filter((item) => !hiddenIds.includes(item.id));

  return (
    <>
      <Seo title="Gallery" description="Medical, academic, and laboratory gallery for Unique College." />
      <section className="page-hero compact"><span className="eyebrow">Gallery</span><h1>Campus life, labs, and clinical learning environments.</h1></section>
      <section className="section gallery-grid">
        {!loading && !visibleItems.length && (
          officialGallery.map(([title, category, image]) => (
            <article className="gallery-card" key={title}>
              <img src={image} alt={title} loading="lazy" />
              <div><strong>{title}</strong><span>{category}</span></div>
            </article>
          ))
        )}
        {visibleItems.map((item) => (
          <article className="gallery-card" key={item.id}>
            <img
              src={assetUrl(item.imagePath)}
              alt={item.title}
              loading="lazy"
              onError={() => setHiddenIds((current) => [...current, item.id])}
            />
            <div><strong>{item.title}</strong><span>{item.category}</span></div>
          </article>
        ))}
      </section>
    </>
  );
}
