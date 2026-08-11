/**
 * HEAVENLY FOOD (hvnly) — PWA Service Worker (sw.js)
 * High-Performance Offline Cache & Asset Resilience
 */
const CACHE_NAME = 'hvnly-pwa-v4';
const STATIC_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './data.json',
  './manifest.json',
  './src/css/main.css',
  './src/css/customer.css',
  './src/css/admin.css',
  './src/js/customer/bundle.js',
  './src/js/admin/bundle.js',
  './public/images/logo.png',
  './public/images/signature.png',
  './public/images/about.png',
  './public/images/qris-static.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching static assets v3');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First fetch strategy for zero-stale cache bug
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
