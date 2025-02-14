const CACHE_NAME = 'sie-app-v1-cache';
const ASSETS_TO_CACHE = [
    '/accounts.office.cheque.inquiry/public/data/files.json',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return Promise.all(
                    ASSETS_TO_CACHE.map((asset) => {
                        return cache.add(asset).catch((err) => {
                            console.error(`Failed to cache ${asset}:`, err);
                        });
                    })
                );
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
