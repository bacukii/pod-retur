const CACHE_NAME = 'pod-retur-v19'; // Versi dinaikkan ke v19

const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 1. Cache CDN secara manual dengan mode 'no-cors'
      // Ini akan menghasilkan "Opaque Response" yang kebal dari error CORS
      CDN_ASSETS.forEach((url) => {
        const req = new Request(url, { mode: 'no-cors' });
        fetch(req)
          .then((res) => cache.put(req, res))
          .catch((err) => console.warn('[SW] Gagal fetch CDN:', url));
      });
      
      // 2. Cache aset lokal (wajib berhasil)
      return cache.addAll(LOCAL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Hanya proses GET request dengan skema HTTP/HTTPS
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Jika ada di cache, langsung kembalikan
      if (cachedResponse) {
        return cachedResponse;
      }

      // Jika tidak ada, ambil dari jaringan
      return fetch(event.request)
        .then((networkResponse) => {
          // Izinkan file disimpan ke cache JIKA: status 200 (sukses) ATAU tipenya 'opaque' (hasil dari no-cors)
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          console.log('[SW] Mode Offline & aset tidak ada di cache:', event.request.url);
        });
    })
  );
});

