const CACHE_NAME = 'muszakrend-cache-v2'; // Verzió növelése
const urlsToCache = [
  '/naptar/',
  '/naptar/index.html',
  '/naptar/icon.png',
  '/naptar/ber.png',
  '/naptar/settings.png',
  '/naptar/calendar.png',
  '/naptar/info.png',
  '/naptar/left.png',
  '/naptar/right.png',
  '/naptar/manifest.json',
  // Google Fonts hozzáadása
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap'
];

self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching files...');
        return cache.addAll(urlsToCache.map(url => {
          return new Request(url, { 
            credentials: 'same-origin',
            cache: 'no-cache' // Friss tartalom lekérése
          });
        }));
      })
      .then(() => {
        console.log('All files cached successfully');
      })
      .catch(error => {
        console.error('Caching failed:', error);
      })
  );
  // Azonnal aktiválja az új service worker-t
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // Régi cache-ek törlése
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Azonnal átveszi az irányítást minden kliens felett
      clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  // Csak GET kérések cache-elése
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Ha van cache-elt válasz, azt adjuk vissza
        if (cachedResponse) {
          console.log('Serving from cache:', event.request.url);
          
          // Háttérben frissítjük a cache-t (stale-while-revalidate)
          fetch(event.request)
            .then(response => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseClone);
                });
              }
            })
            .catch(() => {
              // Offline állapotban ez normális
            });
          
          return cachedResponse;
        }

        // Ha nincs cache-elt válasz, próbáljuk lekérni a hálózatról
        return fetch(event.request)
          .then(response => {
            // Csak a sikeres válaszokat cache-eljük
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(error => {
            console.log('Fetch failed, serving offline page if available:', error);
            
            // Ha a főoldal nem érhető el, próbáljuk a cache-ből
            if (event.request.destination === 'document') {
              return caches.match('/naptar/index.html');
            }
            
            throw error;
          });
      })
  );
});

// Hibajelentés
self.addEventListener('error', event => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('Service Worker unhandled rejection:', event.reason);
});
