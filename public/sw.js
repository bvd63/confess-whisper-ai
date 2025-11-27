// INSTANT REAL-TIME UPDATES - ZERO CACHING
const VERSION = new Date().getTime();
const CACHE_NAME = `confessai-nocache-v${VERSION}`;

// NO caching at all - everything always fresh
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

// Activate service worker - delete ALL caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Delete EVERY SINGLE cache - no exceptions
      return Promise.all(
        cacheNames.map((name) => {
          console.log('🗑️ Deleting cache:', name);
          return caches.delete(name);
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
  
  // Network first for ALL JavaScript/CSS - NO CACHING AT ALL
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      fetch(request, {
        cache: 'reload',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }).catch(() => new Response('Failed to load', { status: 503 }))
    );
    return;
  }
  
  // Network first for images and fonts - NO CACHING
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      fetch(request, {
        cache: 'reload',
        headers: {
          'Cache-Control': 'no-cache'
        }
      }).catch(() => new Response('Offline', { status: 503 }))
    );
    return;
  }
  
  // Default: Network only - NO CACHE FALLBACK
  event.respondWith(
    fetch(request, {
      cache: 'reload',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    }).catch(() => {
      if (request.mode === 'navigate') {
        return new Response('Offline - Please refresh', { 
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
      return new Response('Offline', { status: 503 });
    })
  );
});
