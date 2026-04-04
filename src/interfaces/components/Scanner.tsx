import { useState, useCallback } from "react";
import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { scanComicBook } from "@infrastructure/container";
import { useScanner } from "@interfaces/hooks/useScanner";
import { triggerScanFeedback } from "@interfaces/hooks/useScanFeedback";
import { BookPreview } from "./BookPreview";
import { TitleSearch } from "./TitleSearch";
import { ManualEntry } from "./ManualEntry";

interface ScannerProps {
  onBookAdded: () => void;
}

type ScanState =
  | { step: "idle" }
  | { step: "scanning" }
  | { step: "loading"; isbn: string }
  | { step: "preview"; data: ComicBookCreateInput }
  | { step: "titleSearch" }
  | { step: "manualEntry" }
  | { step: "error"; message: string };

export function Scanner({ onBookAdded }: ScannerProps) {
  const [state, setState] = useState<ScanState>({ step: "idle" });
  const [manualIsbn, setManualIsbn] = useState("");

  const handleDetected = useCallback(async (isbn: string) => {
    triggerScanFeedback();
    setState({ step: "loading", isbn });
    const result = await scanComicBook.lookup(isbn);
    if (result.ok) {
      setState({ step: "preview", data: result.value });
    } else {
      setState({ step: "error", message: result.error });
    }
  }, []);

  const { videoRef, isScanning, error: cameraError, start, stop } = useScanner({
    onDetected: handleDetected,
  });

  const handleStartScan = () => {
    setState({ step: "scanning" });
    start();
  };

  const handleManualLookup = async () => {
    const isbn = manualIsbn.replace(/[-\s]/g, "");
    if (!isbn) return;
    await handleDetected(isbn);
  };

  const handleConfirm = async (data: ComicBookCreateInput) => {
    const result = await scanComicBook.confirm(data);
    if (result.ok) {
      setState({ step: "idle" });
      setManualIsbn("");
      onBookAdded();
    } else {
      setState({ step: "error", message: result.error });
    }
  };

  const handleCancel = () => {
    stop();
    setState({ step: "idle" });
  };

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-4">
      <h1 className="text-2xl font-bold text-text-primary">Ajouter un livre</h1>

      {/* Camera view */}
      <div
        className={`relative w-full max-w-sm aspect-[3/4] rounded-card overflow-hidden bg-text-primary ${
          state.step === "scanning" ? "block" : "hidden"
        }`}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3/4 h-16 border-2 border-brand-amber rounded-lg opacity-80" />
        </div>
        {isScanning && (
          <button
            onClick={handleCancel}
            className="absolute top-3 right-3 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl backdrop-blur-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Idle state */}
      {state.step === "idle" && (
        <>
          <button onClick={handleStartScan} className="btn-primary w-full max-w-sm">
            Scanner un code-barres
          </button>

          <div className="w-full max-w-sm">
            <p className="text-text-tertiary text-sm text-center my-2">ou entrer l'ISBN</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualIsbn}
                onChange={(e) => setManualIsbn(e.target.value)}
                placeholder="978-2-2052-5..."
                className="input-field flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleManualLookup();
                }}
              />
              <button onClick={handleManualLookup} className="btn-primary px-5">
                OK
              </button>
            </div>
          </div>

          <div className="w-full max-w-sm border-t border-border pt-4 mt-1">
            <p className="text-text-tertiary text-sm text-center mb-3">Pas de code-barres ?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setState({ step: "titleSearch" })}
                className="btn-secondary flex-1"
              >
                Chercher par titre
              </button>
              <button
                onClick={() => setState({ step: "manualEntry" })}
                className="btn-secondary flex-1"
              >
                Saisie manuelle
              </button>
            </div>
          </div>
        </>
      )}

      {/* Title search (BnF) */}
      {state.step === "titleSearch" && (
        <>
          <button onClick={handleCancel} className="text-brand-orange font-medium self-start flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
          <TitleSearch
            onSelect={(data) => setState({ step: "preview", data })}
            onManualEntry={() => setState({ step: "manualEntry" })}
          />
        </>
      )}

      {/* Manual entry */}
      {state.step === "manualEntry" && (
        <>
          <button onClick={handleCancel} className="text-brand-orange font-medium self-start flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
          <ManualEntry
            onSubmit={handleConfirm}
            onCancel={handleCancel}
          />
        </>
      )}

      {/* Loading */}
      {state.step === "loading" && (
        <div className="card w-full max-w-sm text-center">
          <div className="animate-spin w-8 h-8 border-2 border-brand-amber border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-text-secondary text-sm">Recherche de l'ISBN {state.isbn}...</p>
        </div>
      )}

      {/* Preview */}
      {state.step === "preview" && (
        <BookPreview
          data={state.data}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {/* Error */}
      {(state.step === "error" || cameraError) && (
        <div className="card w-full max-w-sm border border-status-error/30 bg-status-error-bg">
          <p className="text-status-error text-sm">
            {state.step === "error" ? state.message : cameraError}
          </p>
          <button onClick={handleCancel} className="btn-primary mt-3 w-full">
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
