import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useProgressRefresh(refresh, paths) {
  const { pathname } = useLocation();
  const enabled = paths.includes(pathname);
  useEffect(() => {
    if (!enabled) return;
    const update = () => {
      if (!document.hidden && !document.activeElement?.matches("input,textarea,select")) refresh({ background: true });
    };
    const timer = window.setInterval(update, 15000);
    window.addEventListener("focus", update);
    window.addEventListener("online", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); window.removeEventListener("online", update); };
  }, [enabled, refresh]);
}
