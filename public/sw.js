// SUSPECT Service Worker
// Cache-first for static assets, network-first for puzzle JSON

const CACHE_NAME = 'suspect-v1';

// App shell resources to pre-cache on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/puzzles/index.json',
];

// Install: pre-cache app shell and skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: different strategies based on request type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Network-first for puzzle JSON files (daily puzzles, packs, solutions)
  // These may update, so we want fresh data when online
  if (url.pathname.startsWith('/puzzles/') && url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first for everything else (static assets: JS, CSS, HTML, images)
  event.respondWith(cacheFirst(request));
});

// Cache-first strategy: serve from cache, fall back to network
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    // Cache successful responses for future use
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // If both cache and network fail, return a basic offline response
    // for navigation requests
    if (request.mode === 'navigate') {
      const cachedIndex = await caches.match('/index.html');
      if (cachedIndex) {
        return cachedIndex;
      }
    }
    throw error;
  }
}

// Network-first strategy: try network, fall back to cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Update the cache with fresh data
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Network failed, try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}
