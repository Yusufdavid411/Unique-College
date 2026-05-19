import { useEffect } from "react";

export default function Seo({ title, description }) {
  useEffect(() => {
    document.title = title
      ? `${title} | Unique College`
      : "Unique College of Health Science and Technology";

    const meta = document.querySelector("meta[name='description']");
    if (meta && description) {
      meta.setAttribute("content", description);
    }
  }, [title, description]);

  return null;
}
