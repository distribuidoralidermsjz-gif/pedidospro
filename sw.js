const CACHE = 'pedidospro-v1';

const PRECACHE = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap'
];

// Instalar: pre-cachear recursos clave
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Intentamos cachear todo; si alguno falla (ej. CORS) no bloqueamos
      return Promise.allSettled(PRECACHE.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

// Activar: limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Cache-first para recursos propios, network-first para el resto
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Solo manejamos GET
  if (e.request.method !== 'GET') return;

  // Para CDN y fuentes: cache-first (offline-friendly)
  const isCDN = url.hostname.includes('cdnjs.cloudflare.com') ||
                url.hostname.includes('fonts.googleapis.com') ||
                url.hostname.includes('fonts.gstatic.com');

  if (isCDN) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Para recursos propios (HTML, CSS, JS inline): network-first con fallback a cache
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
