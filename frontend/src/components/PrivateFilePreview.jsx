import { useEffect, useId, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { api, apiErrorMessage, FILE_TRANSFER_TIMEOUT } from "../api/client.js";

const imageTypes = ["image/jpeg", "image/png", "image/webp"];

function PreviewDialog({ path, label, onClose }) {
  const dialog = useRef(null);
  const title = useId();
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let url;
    const modal = dialog.current;
    modal.showModal();
    async function load() {
      try {
        const { data } = await api.get("/files", { params: { path }, responseType: "blob", signal: controller.signal, timeout: FILE_TRANSFER_TIMEOUT, notifyOnError: false });
        if (controller.signal.aborted) return;
        const isImage = imageTypes.includes(data.type);
        if (!isImage && data.type !== "application/pdf") throw new Error("This file type cannot be previewed.");
        url = URL.createObjectURL(data);
        setPreview({ url, isImage });
      } catch (failure) {
        if (!controller.signal.aborted) setError(apiErrorMessage(failure, "This file could not be previewed."));
      }
    }
    load();
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
      modal.close();
    };
  }, [path]);

  return <dialog ref={dialog} className="private-preview-dialog" aria-labelledby={title} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header><h2 id={title}>{label}</h2><button type="button" className="button secondary" onClick={onClose}>Close</button></header>
    {error ? <p role="alert">{error}</p> : !preview ? <p role="status">Loading preview…</p> : preview.isImage
      ? <img src={preview.url} alt={label} onError={() => setError("This image could not be displayed.")} />
      : typeof navigator.pdfViewerEnabled === "boolean" && !navigator.pdfViewerEnabled
        ? <p role="status">This browser does not support inline PDFs. Open the applicant portal in a browser with a PDF viewer to preview this document.</p>
        : <iframe src={preview.url + "#toolbar=0"} title={label} />}
  </dialog>;
}

export default function PrivateFilePreview({ path, label }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  return <>
    <button ref={trigger} type="button" className="portal-add-button" aria-haspopup="dialog" aria-label={`Preview ${label}`} disabled={!path} onClick={() => setOpen(true)}><Eye size={17} aria-hidden="true" />{label}</button>
    {open && <PreviewDialog path={path} label={label} onClose={() => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()); }} />}
  </>;
}
