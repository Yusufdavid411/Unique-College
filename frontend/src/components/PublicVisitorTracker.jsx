import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { API_BASE_URL } from "../api/client.js";
import { sendWebsitePageView } from "../api/websiteAnalytics.js";

export default function PublicVisitorTracker() {
  const { pathname } = useLocation();
  const lastPath = useRef(null);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    sendWebsitePageView({ apiBase: API_BASE_URL, path: pathname });
  }, [pathname]);
  return null;
}
