import { useState, useCallback, useEffect } from "react";
import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { scanComicBook, categoryRepository, updateBook } from "@infrastructure/container";
import { Category } from "@domain/entities/Category";
import { useScanner } from "@interfaces/hooks/useScanner";
import { triggerScanFeedback } from "@interfaces/hooks/useScanFeedback";
import { BookPreview } from "./BookPreview";
import { TitleSearch } from "./TitleSearch";
import { ManualEntry } from "./ManualEntry";
import { ScanSuccess } from "./ScanSuccess";

interface ScannerProps {
  onBookAdded: () => void;
  firstName: string | null;
  onUpdateFirstName: (name: string) => Promise<void>;
  /** When used as overlay from Library, start directly in a specific step */
  initialStep?: "scan" | "search" | "manual";
  /** Close callback for overlay mode */
  onClose?: () => void;
  /** Whether the scanner is embedded in an overlay (hides greeting/idle) */
  embedded?: boolean;
}

type ScanState =
  | { step: "idle" }
  | { step: "scanning" }
  | { step: "loading"; isbn: string }
  | { step: "preview"; data: ComicBookCreateInput }
  | { step: "titleSearch" }
  | { step: "manualEntry" }
  | { step: "success"; title: string; coverUrl: string | null }
  | { step: "error"; message: string };

export function Scanner({ onBookAdded, firstName, onUpdateFirstName, initialStep, onClose, embedded }: ScannerProps) {
  const getInitialState = (): ScanState => {
    if (initialStep === "scan") return { step: "scanning" };
    if (initialStep === "search") return { step: "titleSearch" };
    if (initialStep === "manual") return { step: "manualEntry" };
    return { step: "idle" };
  };

  const [state, setState] = useState<ScanState>(getInitialState);
  const [manualIsbn, setManualIsbn] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [batchCount, setBatchCount] = useState(0);
  const [batchIsbns, setBatchIsbns] = useState<string[]>([]);
  const [showBatchComplete, setShowBatchComplete] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assigningCategory, setAssigningCategory] = useState(false);
  const [showIsbnInput, setShowIsbnInput] = useState(false);

  // First name prompt state
  const [showNamePrompt, setShowNamePrompt] = useState(!firstName);
  const [nameInput, setNameInput] = useState("");

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

  // Auto-start camera when entering in scan mode
  useEffect(() => {
    if (initialStep === "scan") {
      start();
    }
  }, []);

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
      setState({ step: "success", title: data.title, coverUrl: data.coverUrl });
      setBatchCount((c) => c + 1);
      if (batchMode) setBatchIsbns((prev) => [...prev, data.isbn]);
      onBookAdded();
    } else {
      setState({ step: "error", message: result.error });
    }
  };

  const handleSuccessDone = () => {
    if (embedded && onClose) {
      onClose();
      return;
    }
    if (batchMode) {
      // In batch mode, go straight back to scanning
      setState({ step: "scanning" });
      start();
    } else {
      setState({ step: "idle" });
      setManualIsbn("");
    }
  };

  const handleCancel = () => {
    stop();
    if (embedded && onClose) {
      onClose();
      return;
    }
    if (batchMode && batchIsbns.length > 0) {
      // Show batch complete screen with category assignment
      setState({ step: "idle" });
      setBatchMode(false);
      setShowBatchComplete(true);
      categoryRepository.findAllByUser().then((r) => {
        if (r.ok) setCategories(r.value);
      });
    } else {
      setState({ step: "idle" });
      if (batchMode) {
        setBatchMode(false);
        setBatchCount(0);
        setBatchIsbns([]);
      }
    }
  };

  const handleAssignCategory = async (categoryId: string | null) => {
    if (!categoryId) {
      // Skip — leave in "Non classés"
      setShowBatchComplete(false);
      setBatchIsbns([]);
      return;
    }
    setAssigningCategory(true);
    for (const isbn of batchIsbns) {
      await updateBook.execute(isbn, { categoryId });
    }
    setAssigningCategory(false);
    setShowBatchComplete(false);
    setBatchIsbns([]);
    onBookAdded();
  };

  const handleSaveName = async () => {
    const name = nameInput.trim();
    if (!name) return;
    await onUpdateFirstName(name);
    setShowNamePrompt(false);
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4 px-3 sm:px-4 py-4">
      {/* First name prompt for new users */}
      {showNamePrompt && !firstName && state.step === "idle" && (
        <div className="card w-full max-w-sm text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #FB6538 0%, #FF8B5F 50%, #FF8B5F 100%)" }}>
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-text-primary">Comment vous appelez-vous ?</h2>
          <p className="text-sm text-text-tertiary">Pour personnaliser votre expérience</p>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Votre prénom"
            className="input-field text-center"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowNamePrompt(false)}
              className="btn-secondary flex-1 text-sm"
            >
              Plus tard
            </button>
            <button
              onClick={handleSaveName}
              disabled={!nameInput.trim()}
              className="btn-primary flex-1 text-sm"
            >
              Valider
            </button>
          </div>
        </div>
      )}

      {/* Greeting + Hero section */}
      {state.step === "idle" && !(showNamePrompt && !firstName) && (
        <>
          <div className="w-full max-w-sm text-center mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary">
              {firstName ? `${getGreeting()}, ${firstName}` : "Ajouter un livre"}
            </h1>
            <p className="text-text-tertiary text-sm mt-1">
              {firstName ? "Prêt à agrandir votre collection ?" : "Scannez ou recherchez pour commencer"}
            </p>
          </div>

          {/* Quick stats badge */}
          {batchCount > 0 && (
            <div className="bg-status-success-bg text-status-success text-sm font-semibold px-4 py-2 rounded-pill">
              +{batchCount} livre{batchCount > 1 ? "s" : ""} ajouté{batchCount > 1 ? "s" : ""} aujourd'hui
            </div>
          )}

          {/* Primary actions — Scan & Title search */}
          <div className="w-full max-w-sm grid grid-cols-2 gap-3">
            <button
              onClick={handleStartScan}
              className="card text-center py-6 active:scale-[0.97] transition-all duration-200 hover:shadow-float group"
            >
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-transform group-active:scale-90"
                style={{ background: "linear-gradient(135deg, #FB6538 0%, #FF8B5F 100%)" }}>
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2M17 21h2a2 2 0 002-2v-2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 12h10" />
                </svg>
              </div>
              <h3 className="font-bold text-text-primary text-sm">Scanner</h3>
              <p className="text-text-tertiary text-xs mt-0.5">Code-barres</p>
            </button>

            <button
              onClick={() => setState({ step: "titleSearch" })}
              className="card text-center py-6 active:scale-[0.97] transition-all duration-200 hover:shadow-float group"
            >
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-transform group-active:scale-90"
                style={{ background: "linear-gradient(135deg, #FF8B5F 0%, #EC4899 100%)" }}>
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <h3 className="font-bold text-text-primary text-sm">Rechercher</h3>
              <p className="text-text-tertiary text-xs mt-0.5">Par titre ou auteur</p>
            </button>
          </div>

          {/* Secondary actions */}
          <div className="w-full max-w-sm">
            <p className="text-text-tertiary text-xs text-center mb-2">Autres options</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowIsbnInput((v) => !v)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-surface-subtle text-text-secondary text-xs font-semibold active:scale-[0.97] transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16h10M7 20h4" />
                </svg>
                Saisir un code
              </button>
              <button
                onClick={() => setState({ step: "manualEntry" })}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-surface-subtle text-text-secondary text-xs font-semibold active:scale-[0.97] transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                </svg>
                Saisie manuelle
              </button>
              <button
                onClick={() => { setBatchMode(true); setBatchCount(0); handleStartScan(); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-surface-subtle text-text-secondary text-xs font-semibold active:scale-[0.97] transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-1.007.661-1.862 1.572-2.14z" />
                </svg>
                Scan en lot
              </button>
            </div>

            {/* Collapsible ISBN input */}
            {showIsbnInput && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={manualIsbn}
                  onChange={(e) => setManualIsbn(e.target.value)}
                  placeholder="978-2-2052-5..."
                  className="input-field flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleManualLookup();
                  }}
                />
                <button onClick={handleManualLookup} className="btn-primary px-5">
                  OK
                </button>
              </div>
            )}
          </div>
        </>
      )}

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
          <div className="w-3/4 h-16 border-2 border-brand-grape rounded-lg opacity-80" />
        </div>
        {/* Batch mode indicator */}
        {batchMode && isScanning && (
          <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-pill backdrop-blur-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-error animate-pulse" />
            Lot : {batchCount} ajouté{batchCount !== 1 ? "s" : ""}
          </div>
        )}
        {isScanning && (
          <button
            onClick={handleCancel}
            className="absolute top-3 right-3 bg-black/50 text-white rounded-full w-11 h-11 flex items-center justify-center text-xl backdrop-blur-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Title search */}
      {state.step === "titleSearch" && (
        <>
          <button onClick={handleCancel} className="text-brand-grape font-medium self-start flex items-center gap-1">
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
          <button onClick={handleCancel} className="text-brand-grape font-medium self-start flex items-center gap-1">
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
          <div className="animate-spin w-8 h-8 border-2 border-brand-grape border-t-transparent rounded-full mx-auto mb-3" />
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

      {/* Success animation */}
      {state.step === "success" && (
        <ScanSuccess
          title={state.title}
          coverUrl={state.coverUrl}
          onDone={handleSuccessDone}
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

      {/* Batch complete — category assignment */}
      {showBatchComplete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-4 pb-safe">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">{"\ud83c\udf89"}</div>
              <h2 className="text-lg font-bold text-text-primary">
                {batchIsbns.length} livre{batchIsbns.length > 1 ? "s" : ""} ajouté{batchIsbns.length > 1 ? "s" : ""}
              </h2>
              <p className="text-sm text-text-tertiary mt-1">
                Dans quelle catégorie les ranger ?
              </p>
            </div>

            <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto mb-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleAssignCategory(cat.id)}
                  disabled={assigningCategory}
                  className="text-left px-4 py-3 rounded-xl hover:bg-surface-subtle transition-colors active:bg-surface-subtle border border-border"
                >
                  <span className="font-semibold text-text-primary">{cat.name}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => handleAssignCategory(null)}
              disabled={assigningCategory}
              className="w-full py-3 text-text-tertiary text-sm font-medium"
            >
              {assigningCategory ? "Assignation en cours..." : "Laisser dans Non classés"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
