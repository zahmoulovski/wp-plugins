export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Skip service worker in development mode to avoid blob URL issues
      if (import.meta.env.DEV) {
        console.log('Service Worker disabled in development mode');
        return;
      }

      // Only register service worker in production
      if (import.meta.env.PROD) {
        // Create a blob URL for the service worker to work around Vite's bundling
        const swCode = `
          const CACHE_NAME = 'klarrion-app-v1';
          const urlsToCache = [
            '/',
            '/index.html'
          ];

          self.addEventListener('install', (event) => {
            event.waitUntil(
              caches.open(CACHE_NAME)
                .then((cache) => {
                  return cache.addAll(urlsToCache);
                })
            );
          });

          self.addEventListener('activate', (event) => {
            event.waitUntil(
              caches.keys().then((cacheNames) => {
                return Promise.all(
                  cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                      return caches.delete(cacheName);
                    }
                  })
                );
              })
            );
          });

          self.addEventListener('fetch', (event) => {
            event.respondWith(
              caches.match(event.request)
                .then((response) => {
                  return response || fetch(event.request);
                })
            );
          });
        `;
        
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        navigator.serviceWorker
          .register(swUrl)
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      }
    });
  }
}