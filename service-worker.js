const CACHE_NAME = 'tempo-calculator-v14';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './tempo-calculator.css',
    './tempo-calculator.js',
    './apple-touch-icon.png'
];

// Install Event: Cache default files and skip waiting
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                // Force the waiting service worker to become active
                return self.skipWaiting();
            })
    );
});

// Activate Event: Clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all pages immediately
            return self.clients.claim();
        })
    );
});

// Fetch Event: Network first, fall back to cache (for fresh content)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone the response for caching
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request);
            })
    );
});
