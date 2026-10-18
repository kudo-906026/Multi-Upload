// Unique build version placeholder (replaced during build with unique timestamp/hash)
const CACHE_VERSION = '__BUILD_VERSION__';
const CACHE_NAME = 'omnipost-v-' + CACHE_VERSION;

// Core assets to pre-cache (excluding index.html to prevent stale entry points)
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  // Pre-cache static icons & manifest, but don't hold installation waiting
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching notice:', err);
      });
    })
  );
  // Force new service worker to activate immediately without waiting for existing clients to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          // Delete all old or mismatched omnipost caches
          if (name !== CACHE_NAME && name.startsWith('omnipost-')) {
            console.log('[SW] Deleting obsolete cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      // Immediately take control of all active client windows
      console.log('[SW] Claiming clients for cache:', CACHE_NAME);
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // NEVER cache any /api route, /media/ uploads, or non-GET requests
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('/api/') ||
    url.pathname.startsWith('/media') ||
    url.pathname.includes('/media/')
  ) {
    // Pass directly to network without service worker caching
    return;
  }

  // 1. Navigation & HTML Requests: NETWORK-FIRST STRATEGY
  const isHtmlNavigation =
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));

  if (isHtmlNavigation) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          // If network fetch succeeds, cache a clone for offline fallback
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
              cache.put('/index.html', networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Network failed (offline). Fallback to cached index.html
          console.warn('[SW] Navigation network fetch failed, using offline cache fallback.');
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>OmniPost | Offline</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #020617; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 20px; box-sizing: border-box; }
                  .card { background: #0f172a; border: 1px solid #1e293b; padding: 32px; border-radius: 16px; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
                  h1 { margin-top: 0; font-size: 20px; color: #fff; }
                  p { font-size: 14px; color: #94a3b8; line-height: 1.5; }
                  button { margin-top: 16px; background: #6366f1; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
                  button:hover { background: #4f46e5; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>Offline</h1>
                  <p>OmniPost could not connect to the network. Please check your internet connection.</p>
                  <button onclick="window.location.reload()">Retry Connection</button>
                </div>
              </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 2. Static Assets (CSS, JS, Fonts, Images): Cache-First with Network Fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          // Cache successful responses for next time
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If asset is completely unreachable, return a 404 response
          return new Response('Asset unavailable offline', { status: 404, statusText: 'Not Found' });
        });
    })
  );
});
