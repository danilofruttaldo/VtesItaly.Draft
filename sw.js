/* VTES Draft Cube — service worker
 * Strategy:
 *   - HTML, app.js, styles.css & data/cards.json: network-first, fallback to cache
 *     (so code/data updates reach users without needing a VERSION bump)
 *     with cache: "no-cache", so the browser HTTP cache (max-age=600 on Pages)
 *     revalidates and a fresh app.js never runs against a stale core.mjs
 *   - Card images: cache-first in IMAGE_CACHE, which is NOT versioned and
 *     survives deploys (bump it by hand if a scan is replaced in place)
 *   - Icons, manifest: cache-first in the per-release runtime cache
 *
 * VERSION is rewritten to a UTC timestamp by .github/workflows/deploy.yml on each
 * release, so deployed clients always get a fresh cache key. Local dev keeps "v3".
 *
 * Update policy: skipWaiting() + clients.claim() activate the new worker
 * immediately over open tabs. This is safe here because every code/data asset
 * (HTML, JS, CSS, cards.json) is fetched network-first, so already-open tabs
 * pick up fresh versions on the next request. The only cache-first resources
 * are static assets (images, icons, manifest) which rarely change between
 * releases.
 */
const VERSION = "v3";
const SHELL_CACHE = `shell-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const IMAGE_CACHE = "images-v1";

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/styles.css",
  "./assets/app.js",
  "./assets/core.mjs",
  "./assets/vtes.svg",
  "./assets/favicon.ico",
  "./assets/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(SHELL_CACHE)
      // No catch: a failed precache must fail the install, so the browser
      // retries on the next visit instead of activating a worker without the
      // offline shell. cache: "reload" skips the HTTP cache for the same reason
      // as no-cache below.
      .then((c) => c.addAll(SHELL_FILES.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE && k !== IMAGE_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isHtml = req.mode === "navigate" || req.destination === "document";
  const isCode = req.destination === "script" || req.destination === "style";
  const isData = url.pathname.endsWith("/cards.json");

  if (isHtml || isCode || isData) {
    // network-first; on failure try the runtime cache, then the original
    // request in shell, then (only for HTML) the index shell as a last resort.
    // Never fall back cards.json or JS/CSS to index.html — that yields
    // a JSON.parse / script-execution error downstream.
    e.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((resp) => {
          // Only cache successful responses — otherwise a 404/500 would be
          // served back offline in place of the real (possibly cached) content.
          if (resp.ok) {
            const copy = resp.clone();
            caches
              .open(RUNTIME_CACHE)
              .then((c) => c.put(req, copy))
              .catch(() => {});
          }
          return resp;
        })
        .catch(() =>
          caches.match(req).then((cached) => {
            if (cached) return cached;
            if (isHtml) return caches.match("./index.html");
            return new Response("", { status: 504, statusText: "Offline" });
          }),
        ),
    );
    return;
  }

  // cache-first for static assets and images
  const cacheName = url.pathname.includes("/images/") ? IMAGE_CACHE : RUNTIME_CACHE;
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches
              .open(cacheName)
              .then((c) => c.put(req, copy))
              .catch(() => {});
          }
          return resp;
        })
        .catch(() => cached);
    }),
  );
});
