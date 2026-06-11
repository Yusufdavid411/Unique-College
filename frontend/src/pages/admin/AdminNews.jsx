import { useEffect, useState } from "react";
import AdminNotice from "../../components/AdminNotice.jsx";
import LoadingButton from "../../components/LoadingButton.jsx";
import { api, apiErrorMessage, assetUrl } from "../../api/client.js";

const empty = { title: "", excerpt: "", content: "", isPublished: true };

export default function AdminNews() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });

  function load() {
    setLoading(true);
    api
      .get("/news")
      .then((res) => setItems(res.data.data))
      .catch((error) => setNotice({ type: "error", message: apiErrorMessage(error, "News could not be loaded.") }))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setNotice({ type: "", message: "" });
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (image) data.append("image", image);

    try {
      await api.post("/news", data);
      setForm(empty);
      setImage(null);
      event.currentTarget.reset();
      setNotice({ type: "success", message: "News item saved." });
      load();
    } catch (error) {
      setNotice({ type: "error", message: apiErrorMessage(error, "News item could not be saved.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id) {
    setBusyId(id);
    setNotice({ type: "", message: "" });
    try {
      await api.delete(`/news/${id}`);
      setNotice({ type: "success", message: "News item deleted." });
      load();
    } catch (error) {
      setNotice({ type: "error", message: apiErrorMessage(error, "News item could not be deleted.") });
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="admin-page admin-two-col">
      <section>
        <header className="admin-header"><span className="eyebrow">CMS</span><h1>Manage news</h1></header>
        <AdminNotice type={notice.type}>{notice.message}</AdminNotice>
        <div className="admin-list">
          {loading && <div className="empty-state">Loading news...</div>}
          {!loading && !items.length && <div className="empty-state">No news has been created yet.</div>}
          {!loading && items.map((item) => (
            <article className="admin-list-item" key={item.id}>
              {item.imagePath && <img className="admin-list-thumb" src={assetUrl(item.imagePath)} alt={item.title} />}
              <div><strong>{item.title}</strong><span>{item.excerpt}</span></div>
              <LoadingButton className="list-button" loading={busyId === item.id} loadingText="Deleting..." onClick={() => remove(item.id)}>
                Delete
              </LoadingButton>
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
        <LoadingButton type="submit" loading={submitting} loadingText="Saving news...">Save news</LoadingButton>
      </form>
    </div>
  );
}
