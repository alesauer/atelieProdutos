const CACHE_NAME = 'casaluma-static-v1';

// Recursos estáticos pré-cacheados para abertura instantânea do aplicativo
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. REQUISIÇÕES DE API (/api/v1/):
  // Regra Estrita da Casa Luma: NUNCA simular sucesso de mutações de estoque/venda/produção offline.
  // Todas as mutações e validações de saldo DEVEM ser confirmadas de forma atômica pelo servidor.
  if (url.pathname.startsWith('/api/v1/')) {
    // Para mutações (POST, PUT, DELETE, PATCH), repassa direto à rede
    if (request.method !== 'GET') {
      event.respondWith(fetch(request));
      return;
    }

    // Para leituras GET de API, usa network-first com tratamento de indisponibilidade
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            error: 'offline',
            message: 'Você está offline. Conecte-se à internet para atualizar dados em tempo real.',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // 2. RECURSOS ESTÁTICOS (HTML, JS, CSS, Fontes, Ícones):
  // Estratégia Stale-While-Revalidate segura
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
