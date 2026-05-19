import { useEffect, useState } from "react";
import Seo from "../../components/Seo.jsx";
import { api, assetUrl } from "../../api/client.js";
import { imagery } from "../../data/siteData.js";

const fallback = [
  ["Laboratory training", "Labs", imagery.lab],
  ["Clinical simulation", "Training", imagery.hospital],
  ["Student collaboration", "Campus life", imagery.students]
];

export default function Gallery() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/gallery/public").then((res) => setItems(res.data.data)).catch(() => setItems([]));
  }, []);

  const gallery = items.length ? items.map((item) => [item.title, item.category, assetUrl(item.imagePath)]) : fallback;

  return (
    <>
      <Seo title="Gallery" description="Medical, academic, and laboratory gallery for Unique College." />
      <section className="page-hero compact"><span className="eyebrow">Gallery</span><h1>Campus life, labs, and clinical learning environments.</h1></section>
      <section className="section gallery-grid">
        {gallery.map(([title, category, image]) => (
          <article className="gallery-card" key={title}>
            <img src={image} alt={title} loading="lazy" />
            <div><strong>{title}</strong><span>{category}</span></div>
          </article>
        ))}
      </section>
    </>
  );
}
