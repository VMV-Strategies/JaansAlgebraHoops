// ---------------------------------------------------------------------------
// service-worker.js — makes the app work offline.
//
// On first visit it saves every file the app needs. After that the app opens
// from the saved copy (instantly, even with no internet) and quietly checks
// for newer files in the background, so updates show up on the next launch.
//
// WHEN YOU CHANGE THE APP: bump VERSION below (e.g. v1.0.1). That tells every
// installed copy to throw away its old files and download the new ones.
//
// All paths are relative, so this works at a domain root and inside a GitHub
// Pages project folder (username.github.io/repository-name/).
// ---------------------------------------------------------------------------
const VERSION = 'v1.0.0';
const CACHE = `jaans-algebra-hoops-${VERSION}`;

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/core/math.js',
  './js/core/solver.js',
  './js/core/check.js',
  './js/content/categories.js',
  './js/content/worksheet.js',
  './js/content/phrases.js',
  './js/content/playbook.js',
  './js/content/teaching.js',
  './js/store/progress.js',
  './js/ui/dom.js',
  './js/ui/eqinput.js',
  './js/ui/diagrams.js',
  './js/ui/paper.js',
  './js/ui/problem.js',
  './js/ui/screens.js',
  './js/ui/lab.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('jaans-algebra-hoops-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // the app never talks to other sites

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Page loads always get the app shell, whatever the address looks like.
    const key = req.mode === 'navigate' ? './index.html' : req;
    const cached = await cache.match(key, { ignoreSearch: true });
    const refresh = fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { event.waitUntil(refresh); return cached; }
    const fresh = await refresh;
    return fresh || new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
