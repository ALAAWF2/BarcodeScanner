const CACHE_NAME = 'jrd-helper-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://unpkg.com/html5-qrcode',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install Service Worker and cache essential assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Use addAll but ignore individual failures (external CDNs may fail)
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(err => console.warn('Failed to cache:', url, err)))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Stale-while-revalidate strategy
// Serve from cache immediately, then fetch from network and update cache in background
self.addEventListener('fetch', e => {
  // Skip non-GET requests
  if (e.request.method !== 'GET') return;

  // Skip cross-origin requests to Google Apps Script (don't cache API responses)
  if (e.request.url.includes('script.google.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      // Fetch from network in background
      const fetchPromise = fetch(e.request).then(networkResponse => {
        // Only cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseClone).catch(() => {});
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed, return cached or nothing
        return cachedResponse;
      });

      // Return cached immediately, or wait for network if no cache
      return cachedResponse || fetchPromise;
    })
  );
});

// Allow immediate update when new SW is available
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
