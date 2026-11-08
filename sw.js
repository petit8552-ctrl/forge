// Service worker : met l'app en cache pour qu'elle fonctionne hors ligne à la salle.
// Les photos sont mises en cache au fil des séances consultées.
// À incrémenter à chaque mise en ligne pour que les téléphones jettent l'ancienne version.
const CACHE = 'forge-v13';
const FILES = ['./', './index.html', './styles.css', './manifest.json', './icon.svg', './js/app.js', './js/engine.js', './js/exercises.js', './js/media.js', './js/sync.js', './js/config.js', './js/libre.js', './js/rewards.js', './js/coaching.js', './js/cible.js'];

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
  // Réseau limité à 3 s : avec un réseau faible à la salle, on bascule sur le cache au lieu d'attendre.
  const fromCache = () => caches.match(e.request).then((r) => r || caches.match('./index.html'));
  const network = fetch(e.request).then((res) => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
  e.respondWith(
    Promise.race([network, timeout]).then((res) => res || fromCache().then((r) => r || network))
      .catch(() => fromCache())
  );
});
