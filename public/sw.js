// ULTRA-AGGRESSIVE CACHE BUSTING - Always serve fresh content immediately
const VERSION = new Date().getTime();
const CACHE_NAME = `confessai-v${VERSION}`;
const RUNTIME_CACHE = `runtime-v${VERSION}`;

// NO static assets cached - everything fresh
const STATIC_ASSETS = [];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate service worker - aggressively clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          // Delete ALL old caches to force fresh content
          if (name !== CACHE_NAME && name !== RUNTIME_CACHE) {
            console.log('🗑️ Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      // Force immediate control of all clients
      return self.clients.claim();
    }).then(() => {
      // Notify all clients about the update
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED' });
        });
      });
    })
  );
});

// Fetch strategy with smart caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Supabase API calls (always fresh)
  if (url.hostname.includes('supabase')) return;
  
  // NEVER cache version.json - always fetch from network
  if (url.pathname === '/version.json') {
    event.respondWith(
      fetch(request, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
    );
    return;
  }
  
  // Skip external origins
  if (url.origin !== location.origin) return;
  
  // FORCE fresh HTML - absolutely no caching for documents
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request, {
        cache: 'reload', // Force reload from network
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }).catch(() => caches.match('/offline.html') || new Response('Offline', { status: 503 }))
    );
    return;
  }
  
  // Network first for ALL JavaScript/CSS - always check for updates
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      fetch(request, {
        cache: 'reload',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE)
            .then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(request) || new Response('Failed to load', { status: 503 }))
    );
    return;
  }
  
  // Cache first only for images and fonts (static assets that rarely change)
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) {
            // Update cache in background
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
