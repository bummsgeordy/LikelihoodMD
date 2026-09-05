const CACHE_VERSION = 'development-v7';
const BUILD_ASSETS = [];
const CACHE_PREFIX = `likelihood-ratio-rechner-${new URL(self.registration.scope).pathname}-`;
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './info/vierfeldertafel/',
  './info/vierfeldertafel/index.html',
  './info/ckd-risiko/',
  './info/ckd-risiko/index.html',
  './simulation/',
  './simulation/index.html',
  './favicon.svg',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(precacheApp().then(() => self.skipWaiting()));
});

async function precacheApp() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll([...APP_SHELL, ...BUILD_ASSETS]);

  const indexResponse = await fetch('./index.html', { cache: 'no-store' });
  if (!indexResponse.ok) return;

  await cache.put('./index.html', indexResponse.clone());
  const indexHtml = await indexResponse.text();
  const assetUrls = [...indexHtml.matchAll(/(?:src|href)="\.\/([^"]+)"/g)]
    .map(match => `./${match[1]}`)
    .filter(url => url.startsWith('./assets/'));

  await Promise.all([...new Set(assetUrls)].map(url => cache.add(url)));
}

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const exact = await cache.match(request);
    if (exact) return exact;
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '/');
    if (path.endsWith('/info/vierfeldertafel/')) {
      return (await cache.match('./info/vierfeldertafel/index.html')) || Response.error();
    }
    if (path.endsWith('/info/ckd-risiko/')) {
      return (await cache.match('./info/ckd-risiko/index.html')) || Response.error();
    }
    if (path.endsWith('/simulation/')) {
      return (await cache.match('./simulation/index.html')) || Response.error();
    }
    const scopePath = new URL(self.registration.scope).pathname.replace(/\/+$/, '/');
    if (path === scopePath) {
      return (await cache.match('./index.html')) || Response.error();
    }
    return new Response('Diese Unterseite wurde noch nicht für die Offline-Nutzung geladen.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  // Immutable same-origin files are identical for preload and module requests,
  // even when the static server varies its CORS headers by Origin.
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
