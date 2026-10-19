import { useEffect, useState } from "react";
import { api, assetUrl } from "../api/client.js";
import FallbackImage from "./FallbackImage.jsx";

export default function CmsImage({ path, isPublished, fallback, alt, ...props }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (isPublished || !path) return;
    const controller = new AbortController();
    let objectUrl;
    api.get("/files", { params: { path }, responseType: "blob", signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(response.data);
        setPreview({ path, url: objectUrl });
      })
      .catch(() => {
        if (!controller.signal.aborted) setPreview(null);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, isPublished]);

  const src = isPublished ? assetUrl(path) : preview?.path === path ? preview.url : "";
  return <FallbackImage src={src} fallback={fallback} alt={alt} {...props} />;
}
