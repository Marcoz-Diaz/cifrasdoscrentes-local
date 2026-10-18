// Service Worker do Cifras: garante que o app abra qualquer tela sem internet
const CACHE = "cifras-v2";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["/", "/manifest.webmanifest"])));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Só intercepta requisições internas do app
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        // Tenta achar a página ou arquivo no cache
        const hit = await caches.match(req);
        if (hit) return hit;

        // Se estiver navegando entre telas sem internet, entrega a tela principal salva
        if (req.mode === "navigate") {
          const fallback = await caches.match("/");
          if (fallback) return fallback;
        }

        return Response.error();
      }),
  );
});
