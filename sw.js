// Service worker : met l'app en cache pour qu'elle fonctionne hors ligne à la salle.
// Les photos sont mises en cache au fil des séances consultées.
const CACHE = 'forge-v3';
const FILES = ['./', './index.html', './styles.css', './manifest.json', './icon.svg', './js/app.js', './js/engine.js', './js/exercises.js', './js/media.js', './js/sync.js', './js/config.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Réseau d'abord, cache en secours : les mises à jour arrivent dès qu'il y a du réseau.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Les échanges avec le compte (Supabase) ne passent jamais par le cache.
  if (new URL(e.request.url).hostname.endsWith('supabase.co')) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
