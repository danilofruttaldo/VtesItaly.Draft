/* VTES Draft Cube — service worker
 * Strategy:
 *   - HTML & data/cards.json: network-first, fallback to cache (keeps content fresh)
 *   - Card images & static assets: cache-first (images are content-addressed by filename)
 */
const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/vtes.svg",
  "./assets/favicon.ico",
  "./assets/apple-touch-icon.png",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.addAll(SHELL_FILES).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isHtml = req.mode === "navigate" || req.destination === "document";
  const isData = url.pathname.endsWith("/cards.json") || url.pathname.endsWith("/cards.json");

  if (isHtml || isData) {
    // network-first
    e.respondWith(
      fetch(req)
        .then(resp => {
          const copy = resp.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // cache-first for static assets and images
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
