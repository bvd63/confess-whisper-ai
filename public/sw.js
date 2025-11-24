// ULTRA AGGRESSIVE CACHE BUSTING - FORCE REAL-TIME UPDATES
const VERSION = `v${Date.now()}-${Math.random().toString(36).slice(2)}`;
const CACHE_NAME = `confessai-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

// NO static caching - always fetch fresh
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

// Activate service worker - ULTRA aggressively clear ALL caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Delete ALL caches without exception - force fresh content
      return Promise.all(
        cacheNames.map((name) => {
          console.log('🗑️ FORCE deleting cache:', name);
          return caches.delete(name);
        })
      );
    }).then(() => {
      // Immediate control of all clients
      return self.clients.claim();
    }).then(() => {
      // Force reload all clients
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'FORCE_RELOAD' });
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
  
  // ALWAYS fetch fresh HTML - never cache documents
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }).catch(() => caches.match('/offline.html') || new Response('Offline', { status: 503 }))
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
