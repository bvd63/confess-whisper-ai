// Dynamic cache name based on timestamp to force updates
const VERSION = new Date().getTime();
const CACHE_NAME = `confesiuni-cache-v${VERSION}`;
const RUNTIME_CACHE = `runtime-v${VERSION}`;
const API_CACHE = `api-v${VERSION}`;

const STATIC_ASSETS = ['/index.html', '/offline.html', '/manifest.json'];
const CRITICAL_ROUTES = ['/', '/explore', '/messages', '/profile', '/notifications'];
const STATIC_EXTENSIONS = ['image', 'script', 'style', 'font'];
const API_ROUTE_PREFIXES = ['/api/', '/functions/', '/rpc/'];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);

      const routeRequests = CRITICAL_ROUTES.map((path) => new Request(path, { cache: 'reload' }));
      await cache.addAll(routeRequests);
    })()
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
          if (name !== CACHE_NAME && name !== RUNTIME_CACHE && name !== API_CACHE) {
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
  
  // Skip external origins
  if (url.origin !== location.origin) return;
  
  // Network first for HTML pages / navigations
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE)
            .then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // API requests (Network first with cached fallback)
  if (url.origin === location.origin && API_ROUTE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return new Response(JSON.stringify({ offline: true }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        })
    );
    return;
  }
  
  // Cache first for static assets (images, scripts, styles)
  if (STATIC_EXTENSIONS.includes(request.destination)) {
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
