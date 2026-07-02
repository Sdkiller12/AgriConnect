const CACHE_NAME = 'agriconnect-v1';
const PRECACHE_ASSETS = [
  '/',
  '/diagnostic',
  '/assistant',
  '/prix',
  '/meteo',
  '/favicon.ico'
];

// Phase d'installation : pré-mise en cache des routes clés
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pré-mise en cache des assets...');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Suppression de l\'ancien cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interception des requêtes HTTP (Network-first falling back to cache pour les pages, cache-first pour les polices/images statiques)
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET et les requêtes WebSocket/FastAPI en temps réel
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;
  if (event.request.url.includes('chrome-extension')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la réponse réseau est valide, on met en cache une copie
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // En cas de panne de réseau (mode hors-ligne), chercher dans le cache
        console.log('[Service Worker] Mode hors-ligne : chargement depuis le cache local pour', event.request.url);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si la route n'est pas dans le cache, renvoyer la racine '/' par défaut
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Ressource indisponible hors connexion.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
          });
        });
      })
  );
});
