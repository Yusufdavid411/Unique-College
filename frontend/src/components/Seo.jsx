import { useEffect } from "react";
import { useSchool } from "../context/SchoolContext.jsx";

export default function Seo({ title, description }) {
  const { schoolInfo } = useSchool();
  useEffect(() => {
    document.title = !title || title === "Home" ? schoolInfo.shortName : `${title} | ${schoolInfo.shortName}`;

    const meta = document.querySelector("meta[name='description']");
    if (meta && description) {
      meta.setAttribute("content", description);
    }
  }, [title, description, schoolInfo.shortName]);

  return null;
}
