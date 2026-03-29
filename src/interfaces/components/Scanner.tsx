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
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold">Ajouter une BD</h1>

      {/* Camera view */}
      <div
        className={`relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden bg-black ${
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
          <div className="w-3/4 h-16 border-2 border-bd-primary rounded-lg opacity-70" />
        </div>
        {isScanning && (
          <button
            onClick={handleCancel}
            className="absolute top-3 right-3 bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl"
          >
            ✕
          </button>
        )}
      </div>

      {/* Idle state — 3 options */}
      {state.step === "idle" && (
        <>
          <button onClick={handleStartScan} className="btn-primary w-full max-w-sm">
            Scanner un code-barres
          </button>

          <div className="w-full max-w-sm">
            <p className="text-bd-muted text-sm text-center my-2">ou entrer l'ISBN</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualIsbn}
                onChange={(e) => setManualIsbn(e.target.value)}
                placeholder="978-2-2052-5..."
                className="flex-1 bg-bd-card rounded-xl px-4 py-3 text-white placeholder:text-bd-muted outline-none focus:ring-2 focus:ring-bd-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleManualLookup();
                }}
              />
              <button onClick={handleManualLookup} className="btn-primary px-4">
                OK
              </button>
            </div>
          </div>

          <div className="w-full max-w-sm border-t border-white/5 pt-4 mt-1">
            <p className="text-bd-muted text-sm text-center mb-3">Pas de code-barres ?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setState({ step: "titleSearch" })}
                className="flex-1 py-3 rounded-xl bg-bd-card text-white font-semibold active:scale-[0.98] transition-transform"
              >
                Chercher par titre
              </button>
              <button
                onClick={() => setState({ step: "manualEntry" })}
                className="flex-1 py-3 rounded-xl bg-bd-card text-white font-semibold active:scale-[0.98] transition-transform"
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
          <button onClick={handleCancel} className="text-bd-primary self-start">
            ← Retour
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
          <button onClick={handleCancel} className="text-bd-primary self-start">
            ← Retour
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
          <div className="animate-spin w-8 h-8 border-2 border-bd-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p>Recherche de l'ISBN {state.isbn}...</p>
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
        <div className="card w-full max-w-sm border border-red-500/30">
          <p className="text-red-400 text-sm">
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
