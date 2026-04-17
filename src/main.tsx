import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSentry, Sentry } from "./observability/sentry";

// Must run before any React renders so boot-time errors are captured.
initSentry();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 text-center">
          <div className="max-w-sm">
            <div className="text-5xl mb-3">😓</div>
            <h1 className="text-xl font-extrabold text-text-primary mb-2">Oups, un souci</h1>
            <p className="text-sm text-text-secondary mb-5">
              L'app a rencontré une erreur inattendue. On a été notifiés.
              Tu peux essayer de rafraîchir la page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-3 rounded-pill bg-brand-grape text-white font-bold text-sm"
            >
              Rafraîchir
            </button>
          </div>
        </div>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);

// Register service worker for cover image caching
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failed — covers will load without cache
    });
  });
}
