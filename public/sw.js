const CACHE_NAME = 'confesiuni-cache-v2';
const RUNTIME_CACHE = 'runtime-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
];

// Cache strategies per route
const cacheStrategies = {
  '/api/confessions': 'network-first',     // Fresh content priority
  '/api/trending': 'cache-first',          // Speed priority  
  '/static/': 'cache-only',                // Never changes
  '/api/user/': 'network-only',            // Always fresh
  '/images/': 'stale-while-revalidate',    // Fast + update in background
  '/fonts/': 'cache-first',                // Immutable assets
};

// Cache durations (in seconds)
const cacheDurations = {
  images: 86400,      // 24 hours
  api: 300,           // 5 minutes
  content: 120,       // 2 minutes
  static: 86400,      // 24 hours
  fonts: 2592000,     // 30 days
};

/**
 * Determine cache strategy for a request
 */
function getStrategy(url) {
  const urlPath = new URL(url).pathname;
  
  for (const [pattern, strategy] of Object.entries(cacheStrategies)) {
    if (urlPath.includes(pattern)) {
      return strategy;
    }
  }
  
  return 'network-first'; // Default strategy
}

/**
 * Stale-while-revalidate handler
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  // Return cached response immediately, update in background
  return cachedResponse || fetchPromise;
}

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy with smart caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Supabase API calls (always fresh)
  if (url.hostname.includes('supabase')) return;
  
  // Skip external origins
  if (url.origin !== location.origin) return;

  const strategy = getStrategy(request.url);

  // Handle based on strategy
  if (strategy === 'network-only') {
    event.respondWith(fetch(request));
    return;
  }

  if (strategy === 'cache-only') {
    event.respondWith(caches.match(request));
    return;
  }

  if (strategy === 'cache-first') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return response;
        });
      })
    );
    return;
  }

  if (strategy === 'stale-while-revalidate') {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }
  
  // Network first for HTML pages and default
  if (request.destination === 'document' || strategy === 'network-first') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE)
            .then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/offline.html')))
    );
    return;
  }
  
  // Cache first for static assets (images, scripts, styles)
  if (request.destination === 'image' || 
      request.destination === 'script' || 
      request.destination === 'style' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) {
            // Update cache in background (stale-while-revalidate)
            fetch(request)
              .then((response) => {
                if (response.status === 200) {
                  caches.open(RUNTIME_CACHE)
                    .then((cache) => cache.put(request, response));
                }
              })
              .catch(() => {});
            return cached;
          }
          
          // Not in cache, fetch and cache
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(RUNTIME_CACHE)
                  .then((cache) => cache.put(request, responseClone));
              }
              return response;
            })
            .catch(() => new Response('Offline', { status: 503 }));
        })
    );
    return;
  }
  
  // Default: Network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE)
            .then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (request.mode === 'navigate') return caches.match('/offline.html');
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
