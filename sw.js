const CACHE = 'slash-v2';
const TAILWIND = 'https://cdn.tailwindcss.com/3.4.17';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    try { await c.put(TAILWIND, await fetch(new Request(TAILWIND, { mode: 'no-cors' }))); } catch (_) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  // Страница: сначала сеть (чтобы приходили обновления), без сети берём из кэша
  if (r.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(r);
        const c = await caches.open(CACHE);
        c.put('index.html', res.clone());
        return res;
      } catch (_) {
        return (await caches.match('index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Tailwind и свои файлы: из кэша сразу, в фоне обновляем
  if (u.href === TAILWIND || u.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(r);
      const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
  }
});
