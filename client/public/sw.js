/* AniVerse shell worker. Private/API traffic is deliberately network-only. */
const VERSION = 'aniverse-shell-v1';
const STATIC = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/aniverse-192.svg',
  '/icons/aniverse-512.svg'
];
const MAX_RUNTIME_ENTRIES = 60;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(STATIC)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('aniverse-shell-') && key !== VERSION).map(key => caches.delete(key)))));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

function isPrivate(request, url) {
  return Boolean(request.headers.get('Authorization')) || url.pathname.startsWith('/api/') || url.origin.includes('supabase.co');
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || isPrivate(request, url)) return;
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }
  if (!['script', 'style', 'font', 'image'].includes(request.destination)) return;
  event.respondWith(caches.match(request).then(cached => cached ?? fetch(request).then(response => {
    if (!response.ok) return response;
    return caches.open(VERSION).then(async cache => {
      await cache.put(request, response.clone());
      const keys = await cache.keys();
      if (keys.length > MAX_RUNTIME_ENTRIES + STATIC.length) await Promise.all(keys.slice(0, keys.length - MAX_RUNTIME_ENTRIES - STATIC.length).map(key => cache.delete(key)));
      return response;
    });
  })));
});
