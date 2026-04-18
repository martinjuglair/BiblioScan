import * as Sentry from "@sentry/react";

/**
 * Initialise Sentry error reporting for the web app.
 *
 * The DSN is read from VITE_SENTRY_DSN. When unset (e.g. local dev without
 * the env var), Sentry is silently skipped so we don't spam our own quota.
 *
 * Set up:
 *   1. Create a project at https://sentry.io/ → React / Vite
 *   2. Copy the DSN
 *   3. Set VITE_SENTRY_DSN in Vercel env vars (and locally in .env.local)
 *   4. Optional: set VITE_SENTRY_ENV=production|staging|dev
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) {
    // No DSN configured — skip init. This keeps dev quiet and avoids
    // polluting the prod project with local errors.
    return;
  }

  Sentry.init({
    dsn,
    environment: (import.meta.env.VITE_SENTRY_ENV as string | undefined) ?? "production",
    release: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? undefined,

    // Performance monitoring — 10% sample so we stay under the free tier
    tracesSampleRate: 0.1,

    // Session replay (very useful to understand bugs). 0 for now to keep
    // the bundle small — enable later if needed.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Don't send Personally Identifiable Information (user email, IP, etc.)
    // — RGPD minimum viable. Flip if you need it for a specific debug session.
    sendDefaultPii: false,

    // Filter: don't send expected errors (network hiccups, cancelled promises)
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "NetworkError",
      "AbortError",
      "Load failed",
    ],

    beforeSend(event, hint) {
      const err = hint?.originalException;
      // Ignore cancelled fetches — they're normal navigation side-effects
      if (err && typeof err === "object" && "name" in err && err.name === "AbortError") {
        return null;
      }
      // Extra safety: scrub PII that might have been attached manually.
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

export { Sentry };
