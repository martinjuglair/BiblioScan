import { useCallback, useEffect, useRef, useState } from "react";

interface CoverLightboxProps {
  imageUrl: string;
  alt: string;
  onClose: () => void;
}

export function CoverLightbox({ imageUrl, alt, onClose }: CoverLightboxProps) {
  const [scale, setScale] = useState(1);
  const lastTap = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Double-tap to toggle zoom
  const handleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Only handle taps on the image itself
      if ((e.target as HTMLElement).tagName !== "IMG") return;
      e.stopPropagation();

      const now = Date.now();
      if (now - lastTap.current < 300) {
        setScale((prev) => (prev > 1 ? 1 : 2.5));
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    },
    [],
  );

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white transition-colors active:bg-white/20"
        aria-label="Fermer"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Image container */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center w-full h-full p-4"
        style={{ touchAction: scale > 1 ? "pinch-zoom" : "manipulation" }}
        onClick={handleTap}
        onTouchEnd={handleTap}
      >
        <img
          src={imageUrl}
          alt={alt}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `scale(${scale})`,
            transition: "transform 300ms ease-out",
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
