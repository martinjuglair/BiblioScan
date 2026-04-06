import { useState, useRef, useEffect } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
}

/**
 * In-memory set of URLs that have already been loaded successfully.
 * Images in this set skip the shimmer/fade animation entirely.
 */
const loadedUrls = new Set<string>();

/**
 * Lazy-loaded image with shimmer placeholder and memory cache.
 * - IntersectionObserver with 200px margin for early loading
 * - Skips animation for previously loaded images (instant display)
 * - Graceful error handling (hides broken images)
 */
export function LazyImage({ src, alt, className = "", placeholderClassName }: LazyImageProps) {
  const alreadyCached = loadedUrls.has(src);
  const [loaded, setLoaded] = useState(alreadyCached);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(alreadyCached); // Skip observer if cached
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (alreadyCached) return; // Already in memory, no need to observe
    const el = ref.current;
    if (!el) return;

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        },
        { rootMargin: "200px" }, // Start loading 200px before viewport
      );
      observer.observe(el);
      return () => observer.disconnect();
    } else {
      setInView(true);
    }
  }, [alreadyCached]);

  const handleLoad = () => {
    loadedUrls.add(src);
    setLoaded(true);
  };

  const handleError = () => {
    setError(true);
  };

  if (error) {
    return (
      <div className={`bg-surface-subtle flex items-center justify-center text-text-muted text-xs ${className}`}>
        ?
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {/* Shimmer placeholder — hidden once loaded */}
      {!loaded && (
        <div
          className={`absolute inset-0 ${placeholderClassName ?? ""}`}
          style={{
            background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s ease-in-out infinite",
          }}
        />
      )}

      {/* Actual image */}
      {inView && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover ${alreadyCached ? "" : "transition-opacity duration-200"} ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
}
