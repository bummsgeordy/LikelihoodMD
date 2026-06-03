const CACHE_VERSION = 'lr-rechner-schema-v5-2026-06-03-7';
const CACHE_NAME = `likelihood-ratio-rechner-${CACHE_VERSION}`;
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
  await cache.addAll(APP_SHELL);

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
            .filter(key => key.startsWith('likelihood-ratio-rechner-') && key !== CACHE_NAME)
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
    return (await cache.match(request)) || (await cache.match('./index.html'));
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
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
