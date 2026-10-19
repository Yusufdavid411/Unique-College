import { useState } from "react";
import { api, apiErrorMessage } from "../api/client.js";

export default function PrivateFileButton({ path, children = "Download file" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setBusy(true);
    setError("");
    try {
      const response = await api.get("/files", { params: { path }, responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = path.split("/").pop();
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to download this file."));
    } finally {
      setBusy(false);
    }
  }
  return <span><button type="button" className="portal-add-button" disabled={busy || !path} onClick={download}>{busy ? "Downloading…" : children}</button>{error && <span role="alert">{error}</span>}</span>;
}
