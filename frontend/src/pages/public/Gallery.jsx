import { useEffect, useState } from "react";
import Seo from "../../components/Seo.jsx";
import FallbackImage from "../../components/FallbackImage.jsx";
import { api, assetUrl } from "../../api/client.js";
import { assetPaths, officialGallery } from "../../data/siteData.js";

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
      <section className="page-hero compact"><span className="eyebrow">Gallery</span><h1>Campus life, academic learning, and student activities.</h1></section>
      <section className="section gallery-grid">
        {!loading && !items.length && (
          officialGallery.map(([title, category, image]) => (
            <article className="gallery-card" key={title}>
              <img src={image} alt={title} loading="lazy" />
              <div><strong>{title}</strong><span>{category}</span></div>
            </article>
          ))
        )}
        {items.map((item) => (
          <article className="gallery-card" key={item.id}>
            <FallbackImage
              src={assetUrl(item.imagePath)}
              fallback={assetPaths.campusWide}
              alt={item.title}
              loading="lazy"
            />
            <div><strong>{item.title}</strong><span>{item.category}</span></div>
          </article>
        ))}
      </section>
    </>
  );
}
