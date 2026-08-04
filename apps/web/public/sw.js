/*
 * Vaidyasala service worker (§5, Phase 5): offline app shell + a rolling cache
 * of the last ~10 visited pages. Network-first for navigations (fresh content
 * when online), cache fallback when offline.
 */
const SHELL = "vaidyasala-shell-v1";
const PAGES = "vaidyasala-pages-v1";
const MAX_PAGES = 10;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(["/", OFFLINE_URL])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL && k !== PAGES).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimPages() {
  const cache = await caches.open(PAGES);
  const keys = await cache.keys();
  while (keys.length > MAX_PAGES) {
    await cache.delete(keys.shift());
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Don't cache APIs / auth / admin.
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/admin")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(PAGES);
          cache.put(req, fresh.clone());
          void trimPages();
          return fresh;
        } catch {
          const cached = await caches.match(req);
          return cached || (await caches.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
  }
});
