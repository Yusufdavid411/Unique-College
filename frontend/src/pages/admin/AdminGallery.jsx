import { useEffect, useState } from "react";
import AdminNotice from "../../components/AdminNotice.jsx";
import LoadingButton from "../../components/LoadingButton.jsx";
import { api, apiErrorMessage, assetUrl } from "../../api/client.js";

export default function AdminGallery() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", category: "Labs", description: "", isPublished: true });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });

  function load() {
    setLoading(true);
    api
      .get("/gallery")
      .then((res) => setItems(res.data.data))
      .catch((error) => setNotice({ type: "error", message: apiErrorMessage(error, "Gallery could not be loaded.") }))
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
      await api.post("/gallery", data);
      setForm({ title: "", category: "Labs", description: "", isPublished: true });
      setImage(null);
      event.currentTarget.reset();
      setNotice({ type: "success", message: "Gallery image saved." });
      load();
    } catch (error) {
      setNotice({ type: "error", message: apiErrorMessage(error, "Gallery image could not be saved.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id) {
    setBusyId(id);
    setNotice({ type: "", message: "" });
    try {
      await api.delete(`/gallery/${id}`);
      setNotice({ type: "success", message: "Gallery image deleted." });
      load();
    } catch (error) {
      setNotice({ type: "error", message: apiErrorMessage(error, "Gallery image could not be deleted.") });
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="admin-page admin-two-col">
      <section>
        <header className="admin-header"><span className="eyebrow">Uploads</span><h1>Manage gallery</h1></header>
        <AdminNotice type={notice.type}>{notice.message}</AdminNotice>
        <div className="admin-gallery-list">
          {loading && <div className="empty-state">Loading gallery...</div>}
          {!loading && !items.length && <div className="empty-state">No gallery images have been uploaded yet.</div>}
          {!loading && items.map((item) => (
            <article key={item.id}>
              <img src={assetUrl(item.imagePath)} alt={item.title} />
              <div><strong>{item.title}</strong><span>{item.category}</span></div>
              <LoadingButton className="list-button" loading={busyId === item.id} loadingText="Deleting..." onClick={() => remove(item.id)}>
                Delete
              </LoadingButton>
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
        <LoadingButton type="submit" loading={submitting} loadingText="Saving image...">Save image</LoadingButton>
      </form>
    </div>
  );
}
