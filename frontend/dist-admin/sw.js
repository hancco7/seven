const CACHE_NAME = "se7en-v7";
const STATIC_ASSETS = [
  "/",
  "/index.html",
];

// ── Install: cachea assets estáticos ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: limpia caches viejos ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: Network-first para API, Cache-first para assets ───────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API → network only
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Fonts, external CDN → network first, no cache
  if (!url.origin.includes(self.location.origin)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Static assets → cache first, then network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache solo respuestas válidas
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
        return response;
      });
    }).catch(() => {
      // SPA fallback
      if (event.request.mode === "navigate") {
        return caches.match("/index.html");
      }
    })
  );
});

// ── Online/Offline detection via postMessage ──────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
