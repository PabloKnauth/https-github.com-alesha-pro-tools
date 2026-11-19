// App instalable de ROJU CRM. Guarda solo la estructura de la app (pantallas, estilos, logo);
// los datos de clientes nunca se guardan aquí: siempre vienen del servidor con la sesión.
const VERSION = "roju-crm-v2";
const BASE = ["/offline.html", "/logo-roju-480.png", "/icon-192.png", "/favicon-64.png", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return; // datos: siempre en red

  if (req.mode === "navigate") {
    // Pantallas: siempre de la red (la versión más nueva). Sin internet el CRM no puede mostrar datos,
    // así que se muestra una pantalla clara de «Sin conexión» con botón para reintentar.
    e.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    // Archivos con huella en el nombre: no cambian nunca, se guardan la primera vez.
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((r) => {
            if (r.ok) {
              const copia = r.clone();
              caches.open(VERSION).then((c) => c.put(req, copia));
            }
            return r;
          }),
      ),
    );
    return;
  }

  // Íconos y logo: se muestran al instante y se actualizan en segundo plano.
  e.respondWith(
    caches.match(req).then((hit) => {
      const red = fetch(req)
        .then((r) => {
          if (r.ok) {
            const copia = r.clone();
            caches.open(VERSION).then((c) => c.put(req, copia));
          }
          return r;
        })
        .catch(() => hit);
      return hit || red;
    }),
  );
});
