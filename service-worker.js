const CACHE_NAME = 'sie-app-v1-test-cache';
const ASSETS_TO_CACHE = [
    '/accounts.office.cheque.inquiry-test/public/data/files.json',
];


// Install the service worker and cache resources
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching assets...');
                return Promise.all(
                    ASSETS_TO_CACHE.map((asset) => {
                        return cache.add(asset).catch((err) => {
                            console.error(`Failed to cache ${asset}:`, err);
                        });
                    })
                );
            })
            .catch((err) => {
                console.error('Failed to cache assets:', err);
            })
        );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
    );
});


// Clean up old caches
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
});
