const CACHE = 'flowcheck-v20';
// The app itself: install fails (and the previous version keeps running) unless all of these are stored.
const CORE = ['./','./index.html','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png'];
// Reference screenshots: stored one by one so a single failed download cannot block the install.
const ASSETS = [
  './ref/page_01.jpg','./ref/page_02.jpg','./ref/page_03.jpg','./ref/page_04.jpg',
  './ref/page_05.jpg','./ref/page_06.jpg','./ref/page_07.jpg','./ref/page_08.jpg',
  './ref/page_09.jpg','./ref/page_10.jpg','./ref/page_11.jpg','./ref/page_12.jpg',
  './ref/page_13.jpg','./ref/page_14.jpg','./ref/page_15.jpg','./ref/page_16.jpg',
  './ref/page_17.jpg','./ref/page_18.jpg','./ref/page_19.jpg','./ref/page_20.jpg'
];
// cache:'reload' skips the browser's HTTP cache, so a new release never stores a stale copy.
const fresh = u => new Request(u, {cache:'reload'});

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(CORE.map(fresh));
    await Promise.all(ASSETS.map(u => c.add(fresh(u)).catch(() => {})));
  }));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Cache first, so the app opens with no signal. Anything fetched from the network is
// stored for next time; a page load that cannot be served falls back to the app itself.
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // flight.json is live data: never serve it from the cache
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.endsWith('/flight.json')) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, {ignoreSearch:true});
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === 'navigate') return c.match('./index.html');
      throw err;
    }
  }));
});
