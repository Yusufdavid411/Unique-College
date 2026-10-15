import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const mobileQuery = "(max-width: 820px)";
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = (event) => setMatches(event.matches);

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

export default function ResponsiveCarousel({
  items,
  renderItem,
  getKey = (_, index) => index,
  ariaLabel,
  desktopColumns = 3,
  autoPlay = false,
  interval = 5000,
  className = ""
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(null);
  const isMobile = useMediaQuery(mobileQuery);
  const prefersReducedMotion = useMediaQuery(reducedMotionQuery);
  const itemCount = items.length;

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(itemCount - 1, 0)));
  }, [itemCount]);

  useEffect(() => {
    if (!autoPlay || !isMobile || prefersReducedMotion || isPaused || itemCount < 2) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % itemCount);
    }, interval);

    return () => window.clearInterval(intervalId);
  }, [autoPlay, interval, isMobile, isPaused, itemCount, prefersReducedMotion]);

  const changeSlide = (offset) => {
    setActiveIndex((current) => (current + offset + itemCount) % itemCount);
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return;

    const distance = touchStartX.current - event.changedTouches[0].clientX;
    touchStartX.current = null;

    if (Math.abs(distance) < 45) return;
    changeSlide(distance > 0 ? 1 : -1);
  };

  if (!itemCount) return null;

  return (
    <div
      className={`responsive-carousel ${className}`.trim()}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div
        className="responsive-carousel-viewport"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0].clientX;
        }}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="responsive-carousel-track"
          style={{
            "--carousel-columns": desktopColumns,
            transform: isMobile ? `translate3d(-${activeIndex * 100}%, 0, 0)` : "none"
          }}
        >
          {items.map((item, index) => (
            <div
              className="responsive-carousel-slide"
              key={getKey(item, index)}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${itemCount}`}
              aria-hidden={isMobile && index !== activeIndex}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>

      {isMobile && itemCount > 1 && (
        <div className="responsive-carousel-controls">
          <button className="carousel-arrow" type="button" onClick={() => changeSlide(-1)} aria-label="Previous item">
            <ChevronLeft size={20} />
          </button>
          <div className="carousel-dots" aria-label="Choose an item">
            {items.map((item, index) => (
              <button
                className={`carousel-dot ${index === activeIndex ? "is-active" : ""}`}
                type="button"
                key={getKey(item, index)}
                onClick={() => setActiveIndex(index)}
                aria-label={`Show item ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
              />
            ))}
          </div>
          <button className="carousel-arrow" type="button" onClick={() => changeSlide(1)} aria-label="Next item">
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
