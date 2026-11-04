import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { CircleHelp } from "lucide-react";

const ConfirmationContext = createContext(null);

export function ConfirmationProvider({ children }) {
  const [request, setRequest] = useState(null);
  const pending = useRef(null);
  const dialog = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const { pathname } = useLocation();
  const finish = useCallback((confirmed) => {
    const resolve = pending.current;
    pending.current = null;
    dialog.current?.close();
    setRequest(null);
    resolve?.(confirmed);
  }, []);
  const confirmAction = useCallback((options) => {
    if (pending.current) return Promise.resolve(false);
    return new Promise((resolve) => {
      pending.current = resolve;
      setRequest(options);
    });
  }, []);
  useEffect(() => {
    if (request && !dialog.current.open) dialog.current.showModal();
  }, [request]);
  useEffect(() => () => finish(false), [pathname, finish]);
  return <ConfirmationContext.Provider value={confirmAction}>
    {children}
    {createPortal(<dialog ref={dialog} className="school-confirmation" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={(event) => { event.preventDefault(); finish(false); }}>
      <span className="school-confirmation-icon" aria-hidden="true"><CircleHelp size={28} /></span>
      <span className="eyebrow">Unique College</span>
      <h2 id={titleId}>{request?.title || "Confirm your action"}</h2>
      <p id={descriptionId}>{request?.message}</p>
      <div className="school-confirmation-actions">
        <button type="button" className="button secondary" autoFocus onClick={() => finish(false)}>{request?.cancelLabel || "Cancel"}</button>
        <button type="button" className={request?.danger ? "button danger-button" : "button primary"} onClick={() => finish(true)}>{request?.confirmLabel || "Continue"}</button>
      </div>
    </dialog>, document.body)}
  </ConfirmationContext.Provider>;
}

export function useConfirmation() {
  const confirmAction = useContext(ConfirmationContext);
  if (!confirmAction) throw new Error("ConfirmationProvider is required");
  return confirmAction;
}
