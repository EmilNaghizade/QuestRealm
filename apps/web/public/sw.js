const CACHE_PREFIX = "questrealm-offline-";
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const OFFLINE_URL = "/offline.html";
const OFFLINE_SCRIPT = "/offline.js";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await cache.addAll([OFFLINE_URL, OFFLINE_SCRIPT].map(url => new Request(url, { cache: "reload", credentials: "omit" })));
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(
            (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
          )
          .map((name) => caches.delete(name)),
      );

      await self.clients.claim();
    })(),
  );
});

async function handleNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE_NAME);
    const offlinePage = await cache.match(OFFLINE_URL);

    if (offlinePage) {
      return offlinePage;
    }

    return new Response("QuestRealm is offline. Reconnect and try again.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // API requests always go directly to the network.
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    return;
  }

  // The standalone fallback needs only its own translation script.
  if (url.pathname === OFFLINE_SCRIPT) {
    event.respondWith(fetch(request).catch(async () => {
      const cached = await (await caches.open(CACHE_NAME)).match(OFFLINE_SCRIPT);
      return cached || Response.error();
    }));
    return;
  }

  // Only document navigation uses the offline fallback.
  // Scripts, styles and account responses are not cached.
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
  }
});
