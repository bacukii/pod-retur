const CACHE_NAME = 'pod-retur-v10';
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Hanya proses request dengan skema http/https (menghindari error ekstensi chrome/skema lain)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return dari cache jika ada
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Jika tidak ada di cache, ambil dari network
      return fetch(event.request).then((networkResponse) => {
        // Jangan cache jika response gagal atau bukan response standar/CORS
        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
          return networkResponse;
        }

        // Clone response karena response stream hanya bisa dibaca satu kali
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return networkResponse;
      }).catch(() => {
        // Abaikan error fetch jika benar-benar offline dan resource belum dicache
        console.log('Offline dan resource tidak ditemukan di cache:', event.request.url);
      });
    })
  );
});


