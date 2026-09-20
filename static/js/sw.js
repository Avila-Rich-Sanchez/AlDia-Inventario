const CACHE_NAME = 'aldia-v1';

// Archivos estáticos indispensables para que la app abra sin internet
const ASSETS_TO_CACHE = [
    '/',
    '/static/css/style.css',
    '/static/js/main.js',
    '/static/favicon.svg',
    '/static/favicon.png',
    'https://cdn.tailwindcss.com' // Si dependes del CDN, conviene cachearlo
];

// 1. Instalar el Service Worker y guardar en Caché la app básica
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
        console.log('[PWA] Guardando archivos estáticos en caché...');
        return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// 2. Activar y limpiar cachés antiguas si se actualiza la versión
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
        return Promise.all(
            keys.map((key) => {
            if (key !== CACHE_NAME) {
                return caches.delete(key);
            }
            })
        );
        })
    );
    self.clients.claim();
});

// 3. Estrategia de respuesta: Network First con fallback a Caché
// Intenta traer la versión más fresca del servidor; si falla (offline), usa la caché.
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
        .then((networkResponse) => {
            // Guardar/Actualizar copia en caché de la respuesta fresca
            if (event.request.method === 'GET') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
            });
            }
            return networkResponse;
        })
        .catch(() => {
            // Si no hay red (offline), servir desde la caché
            return caches.match(event.request);
        })
    );
    });