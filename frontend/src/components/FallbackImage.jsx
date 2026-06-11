import { useEffect, useState } from "react";

export default function FallbackImage({ src, fallback, alt, ...props }) {
  const [currentSrc, setCurrentSrc] = useState(src || fallback);

  useEffect(() => {
    setCurrentSrc(src || fallback);
  }, [src, fallback]);

  if (!currentSrc) return null;

  return (
    <img
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (fallback && currentSrc !== fallback) {
          setCurrentSrc(fallback);
        }
      }}
      {...props}
    />
  );
}
