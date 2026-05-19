import { useEffect, useState } from "react";
import { api, assetUrl } from "../../api/client.js";

export default function AdminGallery() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", category: "Labs", description: "", isPublished: true });
  const [image, setImage] = useState(null);

  function load() {
    api.get("/gallery").then((res) => setItems(res.data.data));
  }

  useEffect(load, []);

  async function submit(event) {
    event.preventDefault();
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (image) data.append("image", image);
    await api.post("/gallery", data, { headers: { "Content-Type": "multipart/form-data" } });
    setForm({ title: "", category: "Labs", description: "", isPublished: true });
    setImage(null);
    load();
  }

  async function remove(id) {
    await api.delete(`/gallery/${id}`);
    load();
  }

  return (
    <div className="admin-page admin-two-col">
      <section>
        <header className="admin-header"><span className="eyebrow">Uploads</span><h1>Manage gallery</h1></header>
        <div className="admin-gallery-list">
          {items.map((item) => (
            <article key={item.id}>
              <img src={assetUrl(item.imagePath)} alt={item.title} />
              <div><strong>{item.title}</strong><span>{item.category}</span></div>
              <button type="button" onClick={() => remove(item.id)}>Delete</button>
            </article>
          ))}
        </div>
      </section>
      <form className="form-panel" onSubmit={submit}>
        <h2>Upload image</h2>
        <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input required placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <textarea rows="4" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <label className="file-field">Image<input required accept="image/png,image/jpeg,image/webp" type="file" onChange={(e) => setImage(e.target.files?.[0] || null)} /></label>
        <label className="check-field"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Published</label>
        <button className="button primary" type="submit">Save image</button>
      </form>
    </div>
  );
}
