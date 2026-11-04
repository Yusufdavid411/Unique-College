import { useEffect, useId, useRef, useState } from "react";
import { Download, Eye } from "lucide-react";
import { api, apiErrorMessage, FILE_TRANSFER_TIMEOUT } from "../api/client.js";

const imageTypes = ["image/jpeg", "image/png", "image/webp"];

function PreviewDialog({ path, endpoint, label, allowDownload, filename, onClose }) {
  const dialog = useRef(null);
  const title = useId();
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  function download() {
    if (!preview) return;
    const link = document.createElement("a");
    link.href = preview.url;
    link.download = filename || path?.split("/").pop() || "document.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  useEffect(() => {
    const controller = new AbortController();
    let url;
    const modal = dialog.current;
    modal.showModal();
    async function load() {
      try {
        const { data } = await api.get(endpoint || "/files", { params: endpoint ? undefined : { path }, responseType: "blob", signal: controller.signal, timeout: FILE_TRANSFER_TIMEOUT, notifyOnError: false });
        if (controller.signal.aborted) return;
        const isImage = imageTypes.includes(data.type);
        if (!isImage && data.type !== "application/pdf") throw new Error("This file type cannot be previewed.");
        url = URL.createObjectURL(data);
        setPreview({ url, isImage });
      } catch (failure) {
        if (failure.response?.data instanceof Blob) {
          try { failure.response.data = JSON.parse(await failure.response.data.text()); } catch {}
        }
        if (!controller.signal.aborted) setError(apiErrorMessage(failure, "This file could not be previewed."));
      }
    }
    load();
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
      modal.close();
    };
  }, [path, endpoint]);

  return <dialog ref={dialog} className="private-preview-dialog" aria-labelledby={title} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header><h2 id={title}>{label}</h2><div className="document-preview-actions">{allowDownload && preview && <button type="button" className="button secondary" onClick={download}><Download size={18} aria-hidden="true" />Download document</button>}<button type="button" className="button secondary" onClick={onClose}>Close</button></div></header>
    {error ? <p role="alert">{error}</p> : !preview ? <p role="status">Loading preview…</p> : preview.isImage
      ? <img src={preview.url} alt={label} onError={() => setError("This image could not be displayed.")} />
      : typeof navigator.pdfViewerEnabled === "boolean" && !navigator.pdfViewerEnabled
        ? <p role="status">This browser does not support inline PDFs. Open the applicant portal in a browser with a PDF viewer to preview this document.</p>
        : <iframe src={preview.url + "#toolbar=0"} title={label} />}
  </dialog>;
}

export default function PrivateFilePreview({ path, endpoint, label, buttonText, allowDownload = false, filename }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  return <>
    <button ref={trigger} type="button" className={buttonText ? "button secondary document-view-button" : "portal-add-button"} aria-haspopup="dialog" aria-label={`Preview ${label}`} disabled={!path && !endpoint} onClick={() => setOpen(true)}><Eye size={17} aria-hidden="true" />{buttonText || label}</button>
    {open && <PreviewDialog path={path} endpoint={endpoint} label={label} allowDownload={allowDownload} filename={filename} onClose={() => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()); }} />}
  </>;
}
