const CACHE = 'discover-playback-v8';
const ROOT = self.registration.scope;
const CORE = [ROOT, new URL('index.html', ROOT).href, new URL('manifest.webmanifest', ROOT).href,
  new URL('icon-192.png', ROOT).href, new URL('icon-512.png', ROOT).href];
self.addEventListener('install', event => { event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())
)});
self.addEventListener('activate', event => { event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('discover-playback-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())
)});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && new URL(event.request.url).origin === self.location.origin) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(async () => (await caches.match(event.request)) || (await caches.match(ROOT))));
});
