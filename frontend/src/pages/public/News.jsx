import { useEffect, useState } from "react";
import Seo from "../../components/Seo.jsx";
import { api, assetUrl } from "../../api/client.js";

export default function News() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/news/public")
      .then((res) => setItems(res.data.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Seo title="News" description="News and announcements from Unique College." />
      <section className="page-hero compact"><span className="eyebrow">News</span><h1>Articles, announcements, and academic updates.</h1></section>
      <section className="section cards-grid">
        {!loading && !items.length && (
          <div className="empty-state">No published news yet. Please check back for official school announcements.</div>
        )}
        {items.map((item) => (
          <article className="news-card news-card-media" key={item.id}>
            {item.imagePath && <img src={assetUrl(item.imagePath)} alt={item.title} loading="lazy" />}
            <h2>{item.title}</h2>
            <p>{item.excerpt}</p>
            {item.content && <p>{item.content}</p>}
          </article>
        ))}
      </section>
    </>
  );
}
