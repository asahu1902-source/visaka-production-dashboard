const CACHE_NAME = "visaka-production-dashboard-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png"
];

// Install service worker
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate new service worker
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch handling
self.addEventListener("fetch", event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Do NOT cache Google Apps Script/API data.
  // Always get fresh production data from server.
  if (
    url.hostname.includes("script.google.com") ||
    url.hostname.includes("script.googleusercontent.com")
  ) {
    return;
  }

  // App shell: cache first, then network
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then(networkResponse => {

            // Cache successful same-origin files
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              url.origin === self.location.origin
            ) {
              const responseClone = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(request, responseClone);
                });
            }

            return networkResponse;
          });
      })
      .catch(() => {
        // If offline and page is requested, show cached app
        if (request.mode === "navigate") {
          return caches.match("./index.html");
        }
      })
  );
});
