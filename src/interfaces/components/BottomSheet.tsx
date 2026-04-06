import { useEffect, useRef, ReactNode } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const prevOverflow = useRef<string>("");

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      prevOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prevOverflow.current;
    }
    return () => {
      document.body.style.overflow = prevOverflow.current;
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-hero transition-transform duration-300 ease-out max-h-[85vh] flex flex-col"
        style={{
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 cursor-grab" onClick={onClose}>
          <div className="w-10 h-1 rounded-full bg-border-strong" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-4 pb-3 border-b border-border">
            <h2 className="text-lg font-bold text-text-primary text-center">{title}</h2>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
}
