// Service Worker for Shelfy — caches cover images
const CACHE_NAME = "shelfy-covers-v1";

// Cover image domains to cache
const COVER_DOMAINS = [
  "covers.openlibrary.org",
  "images-na.ssl-images-amazon.com",
  "books.google.com",
  "encrypted-tbn0.gstatic.com",
];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("shelfy-covers-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only cache GET requests for cover images
  if (event.request.method !== "GET") return;
  if (!COVER_DOMAINS.some((d) => url.hostname.includes(d))) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((response) => {
          // Only cache successful image responses > 500 bytes (skip placeholders)
          if (
            response.ok &&
            response.headers.get("content-type")?.startsWith("image/")
          ) {
            const cl = response.headers.get("content-length");
            if (!cl || parseInt(cl, 10) > 500) {
              cache.put(event.request, response.clone());
            }
          }
          return response;
        }).catch(() => {
          // Network error — return a transparent pixel as fallback
          return new Response(
            Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), c => c.charCodeAt(0)),
            { headers: { "Content-Type": "image/gif" } }
          );
        });
      })
    )
  );
});
