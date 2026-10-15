import { useEffect, useId, useRef } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { createPortal } from "react-dom";

export default function LeadershipImageLightbox({ profiles, currentIndex, onChange, onClose }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previouslyFocusedElement = useRef(null);
  const touchStartX = useRef(null);
  const profile = profiles[currentIndex];
  const hasMultipleProfiles = profiles.length > 1;

  useEffect(() => {
    previouslyFocusedElement.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocusedElement.current?.focus();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const focusableElements = dialogRef.current?.querySelectorAll("button:not([disabled])");
        if (!focusableElements?.length) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
      if (!hasMultipleProfiles) return;
      if (event.key === "ArrowLeft") onChange((currentIndex - 1 + profiles.length) % profiles.length);
      if (event.key === "ArrowRight") onChange((currentIndex + 1) % profiles.length);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, hasMultipleProfiles, onChange, onClose, profiles.length]);

  if (!profile) return null;

  const showPrevious = () => onChange((currentIndex - 1 + profiles.length) % profiles.length);
  const showNext = () => onChange((currentIndex + 1) % profiles.length);

  const handleTouchEnd = (event) => {
    if (!hasMultipleProfiles || touchStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 50) return;
    if (distance > 0) showPrevious();
    else showNext();
  };

  return createPortal(
    <div
      className="leadership-lightbox"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="leadership-lightbox-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
      >
        <header className="leadership-lightbox-header">
          <span className="leadership-lightbox-label"><Images size={17} />Leadership gallery</span>
          <button
            className="leadership-lightbox-close"
            type="button"
            onClick={onClose}
            ref={closeButtonRef}
            aria-label="Close portrait gallery"
          >
            <X size={23} />
          </button>
        </header>

        <div
          className="leadership-lightbox-viewport"
          onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }}
          onTouchEnd={handleTouchEnd}
        >
          <img src={profile.image} alt={`Full portrait of ${profile.name}`} key={profile.image} />

          {hasMultipleProfiles && (
            <>
              <button
                className="leadership-lightbox-arrow previous"
                type="button"
                onClick={showPrevious}
                aria-label="View previous leader"
              >
                <ChevronLeft size={27} />
              </button>
              <button
                className="leadership-lightbox-arrow next"
                type="button"
                onClick={showNext}
                aria-label="View next leader"
              >
                <ChevronRight size={27} />
              </button>
            </>
          )}
        </div>

        <footer className="leadership-lightbox-footer">
          <div className="leadership-lightbox-caption">
            <div>
              <h2 id={titleId}>{profile.name}</h2>
              <p>{profile.role}</p>
            </div>
            <span>{currentIndex + 1} / {profiles.length}</span>
          </div>

          {hasMultipleProfiles && (
            <div className="leadership-lightbox-thumbnails" aria-label="Choose a leadership portrait">
              {profiles.map((item, index) => (
                <button
                  className={index === currentIndex ? "active" : ""}
                  type="button"
                  onClick={() => onChange(index)}
                  aria-label={`View ${item.name}`}
                  aria-current={index === currentIndex ? "true" : undefined}
                  key={`${item.name}-${item.role}`}
                >
                  <img src={item.image} alt="" />
                </button>
              ))}
            </div>
          )}
        </footer>
      </section>
    </div>,
    document.body
  );
}
