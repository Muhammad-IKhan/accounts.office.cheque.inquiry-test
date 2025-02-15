
//scripts/service-worker.js
const CACHE_NAME = 'sie-app-v1-cache';
const ASSETS_TO_CACHE  = [
  // '/',
  // '/index.html',
  // '/styles/styles.css',
  // '/scripts/main.js',
  // '/scripts/domElements.js',
  // '/scripts/eventListeners.js',
  // '/scripts/tableFunctions.js',
  // '/scripts/pagination.js',
  // '/scripts/xmlHandling.js',
  // '/scripts/errorHandling.js',
  // '/scripts/tableUtilities.js',
  // '/favicon.ico',
  // '/accounts.office.cheque.inquiry/',
  // '/accounts.office.cheque.inquiry/index.html',
  // '/accounts.office.cheque.inquiry/styles/style.css',
  // '/accounts.office.cheque.inquiry/scripts/main.js',
  // '/accounts.office.cheque.inquiry/scripts/domElements.js',
  // '/accounts.office.cheque.inquiry/scripts/eventListeners.js',
  // '/accounts.office.cheque.inquiry/scripts/tableFunctions.js',
  // '/accounts.office.cheque.inquiry/scripts/pagination.js',
  // '/accounts.office.cheque.inquiry/scripts/errorHandling.js',
  // '/accounts.office.cheque.inquiry/scripts/utilities.js',
  // '/accounts.office.cheque.inquiry/public/data/data.xml',
  '/accounts.office.cheque.inquiry/public/data/files.json',
  // '/accounts.office.cheque.inquiry/scripts/xmlHandling.js'
];

// Rest of your service worker code...

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
