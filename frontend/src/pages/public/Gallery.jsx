import { useEffect, useState } from "react";
import Seo from "../../components/Seo.jsx";
import { api, assetUrl } from "../../api/client.js";

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/gallery/public")
      .then((res) => setItems(res.data.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Seo title="Gallery" description="Medical, academic, and laboratory gallery for Unique College." />
      <section className="page-hero compact"><span className="eyebrow">Gallery</span><h1>Campus life, labs, and clinical learning environments.</h1></section>
      <section className="section gallery-grid">
        {!loading && !items.length && (
          <div className="empty-state">No published gallery images yet. Please check back after the school uploads new campus photos.</div>
        )}
        {items.map((item) => (
          <article className="gallery-card" key={item.id}>
            <img src={assetUrl(item.imagePath)} alt={item.title} loading="lazy" />
            <div><strong>{item.title}</strong><span>{item.category}</span></div>
          </article>
        ))}
      </section>
    </>
  );
}
