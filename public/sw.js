/*
  Basic service worker for Next.js App Router PWA
  - Precache core shell
  - Runtime cache for images and same-origin GET requests
*/

const CACHE_NAME = "imagestudio-v1";
const CORE_ASSETS = [
  "/",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== "GET") return;

  // For cross-origin requests (like remote images), do a cache-first for images only
  if (url.origin !== self.location.origin) {
    if (req.destination === "image") {
      event.respondWith(cacheFirst(req));
    }
    return;
  }

  // Same-origin: prefer network-first for HTML/JSON, cache-first for static assets
  if (req.destination === "document" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(req));
  } else if (["style", "script", "image", "font"].includes(req.destination)) {
    event.respondWith(cacheFirst(req));
  } else {
    event.respondWith(networkFirst(req));
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    cache.put(req, res.clone());
    return res;
  } catch (e) {
    return cached || new Response("", { status: 504 });
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(req);
    return cached || new Response("", { status: 504 });
  }
}
