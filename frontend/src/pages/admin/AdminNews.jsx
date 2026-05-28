import { useEffect, useState } from "react";
import { api, assetUrl } from "../../api/client.js";

const empty = { title: "", excerpt: "", content: "", isPublished: true };

export default function AdminNews() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [image, setImage] = useState(null);

  function load() {
    api.get("/news").then((res) => setItems(res.data.data));
  }

  useEffect(load, []);

  async function submit(event) {
    event.preventDefault();
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (image) data.append("image", image);

    await api.post("/news", data, { headers: { "Content-Type": "multipart/form-data" } });
    setForm(empty);
    setImage(null);
    event.currentTarget.reset();
    load();
  }

  async function remove(id) {
    await api.delete(`/news/${id}`);
    load();
  }

  return (
    <div className="admin-page admin-two-col">
      <section>
        <header className="admin-header"><span className="eyebrow">CMS</span><h1>Manage news</h1></header>
        <div className="admin-list">
          {items.map((item) => (
            <article className="admin-list-item" key={item.id}>
              {item.imagePath && <img className="admin-list-thumb" src={assetUrl(item.imagePath)} alt={item.title} />}
              <div><strong>{item.title}</strong><span>{item.excerpt}</span></div>
              <button type="button" onClick={() => remove(item.id)}>Delete</button>
            </article>
          ))}
        </div>
      </section>
      <form className="form-panel" onSubmit={submit}>
        <h2>Create news</h2>
        <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input required placeholder="Excerpt" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
        <label className="file-field">News image<input required accept="image/png,image/jpeg,image/webp" type="file" onChange={(e) => setImage(e.target.files?.[0] || null)} /></label>
        <textarea required rows="8" placeholder="Content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        <label className="check-field"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Published</label>
        <button className="button primary" type="submit">Save news</button>
      </form>
    </div>
  );
}
