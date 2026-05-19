import { useEffect, useState } from "react";
import Seo from "../../components/Seo.jsx";
import { api } from "../../api/client.js";
import { sampleNews } from "../../data/siteData.js";

export default function News() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/news/public").then((res) => setItems(res.data.data)).catch(() => setItems([]));
  }, []);

  const news = items.length ? items : sampleNews;

  return (
    <>
      <Seo title="News" description="News and announcements from Unique College." />
      <section className="page-hero compact"><span className="eyebrow">News</span><h1>Articles, announcements, and academic updates.</h1></section>
      <section className="section cards-grid">
        {news.map((item) => (
          <article className="news-card" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.excerpt}</p>
            {item.content && <p>{item.content}</p>}
          </article>
        ))}
      </section>
    </>
  );
}
