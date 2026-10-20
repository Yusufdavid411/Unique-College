import { useState } from "react";
import { api, apiErrorMessage, FILE_TRANSFER_TIMEOUT } from "../api/client.js";

export default function PrivateFileButton({ path, endpoint, filename, children = "Download file" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null);
  async function download() {
    setBusy(true);
    setError("");
    setProgress(null);
    try {
      const response = await api.get(endpoint || "/files", { params: endpoint ? undefined : { path }, responseType: "blob", timeout: FILE_TRANSFER_TIMEOUT, onDownloadProgress: (event) => setProgress(event.total ? Math.round(event.loaded / event.total * 100) : null) });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || path?.split("/").pop() || "document.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (requestError) {
      if (requestError.response?.data instanceof Blob) {
        try { requestError.response.data = JSON.parse(await requestError.response.data.text()); } catch {}
      }
      setError(apiErrorMessage(requestError, "Unable to download this file."));
    } finally {
      setBusy(false);
    }
  }
  return <span className="private-file-control"><button type="button" className="portal-add-button" disabled={busy || (!path && !endpoint)} onClick={download}>{busy ? `Downloading${progress === null ? "…" : ` ${progress}%`}` : children}</button>{error && <span className="private-file-error" role="alert">{error}</span>}</span>;
}
