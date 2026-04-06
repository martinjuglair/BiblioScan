import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface ToastData {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastData | null>(null);
  const [visible, setVisible] = useState(false);
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const toast = useCallback((message: string, type: ToastType = "success") => {
    // Clear any pending dismiss timer
    if (timerRef.current) clearTimeout(timerRef.current);

    const id = ++idRef.current;
    setCurrent({ id, message, type });
    setVisible(true);

    timerRef.current = setTimeout(() => {
      setVisible(false);
      // Remove from DOM after slide-out animation
      setTimeout(() => setCurrent(null), 300);
    }, 3000);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {current && (
        <>
          <style>{`
            @keyframes toast-slide-up {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes toast-slide-down {
              from { transform: translateY(0); opacity: 1; }
              to { transform: translateY(100%); opacity: 0; }
            }
          `}</style>
          <div
            className="fixed bottom-20 left-4 right-4 z-[55] flex justify-center pointer-events-none"
          >
            <div
              className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-hero bg-white max-w-sm w-full"
              style={{
                animation: visible
                  ? "toast-slide-up 300ms ease-out forwards"
                  : "toast-slide-down 300ms ease-in forwards",
              }}
            >
              <ToastIcon type={current.type} />
              <span className="text-sm font-medium text-text-primary flex-1">{current.message}</span>
            </div>
          </div>
        </>
      )}
    </ToastContext.Provider>
  );
}

function ToastIcon({ type }: { type: ToastType }) {
  if (type === "success") {
    return (
      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  if (type === "error") {
    return (
      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }

  // info
  return (
    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>
    </div>
  );
}
