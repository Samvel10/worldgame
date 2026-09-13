/* global self, caches, fetch */
const CACHE = 'barrik-public-v3';
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['/', '/favicon.svg', '/manifest.webmanifest']))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const legacy = keys.some((key) => key === 'barrik-shell-v1' || key === 'barrik-shell-v2');
      await Promise.all(
        keys
          .filter((key) => key.startsWith('barrik-') && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
      // One-time migration of the old cache-first shell. Normal reloads do not navigate clients.
      if (legacy) {
        const clients = await self.clients.matchAll({ type: 'window' });
        // Do not await navigation inside activation: the new document waits for activation itself.
        for (const client of clients) void client.navigate(client.url).catch(() => undefined);
      }
    })(),
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Account/session responses and WebSocket upgrades must never enter a public cache.
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/ws')
  )
    return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put('/', copy)));
          }
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }
  if (
    !url.pathname.startsWith('/assets/') &&
    !['/favicon.svg', '/manifest.webmanifest'].includes(url.pathname)
  )
    return;
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE).then(async (cache) => {
                await cache.put(event.request, copy);
                const keys = await cache.keys();
                if (keys.length > 80)
                  await cache.delete(
                    keys.find((k) => new URL(k.url).pathname.startsWith('/assets/')) ?? keys[0],
                  );
              }),
            );
          }
          return response;
        }),
    ),
  );
});
