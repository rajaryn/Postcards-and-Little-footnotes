const CACHE_NAME = "postcards-shell-v5";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/css/reset.css",
  "/css/styles.css",
  "/js/api.js",
  "/js/auth.js",
  "/js/trips.js",
  "/js/moments.js",
  "/js/capture.js",
  "/js/app.js",
  "/manifest.json",
  "/icons/icon.svg",
];

// Install: Cache static app shell assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[ServiceWorker] Pre-caching offline shell v3");
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.warn("[ServiceWorker] Pre-caching failed:", err);
      })
  );
});

// Activate: Clean up old cache versions and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_NAME) {
              console.log("[ServiceWorker] Removing old cache", key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Network-first with cache fallback for fresh UI
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip any cross-origin requests (e.g. Cloudflare R2, Google Fonts, external CDNs)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip non-GET requests (e.g. POST, PUT, DELETE)
  if (event.request.method !== "GET") {
    return;
  }

  // For API or local upload endpoints, always hit network directly
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
          return new Response("Network error occurred", {
            status: 408,
            headers: { "Content-Type": "text/plain" },
          });
        });
      })
  );
});
