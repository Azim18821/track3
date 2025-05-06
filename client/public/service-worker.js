// Service Worker for TrackMadeEazE PWA
const CACHE_NAME = 'trackmadeease-v1';
const OFFLINE_URL = '/offline.html';

// Cache important resources during the install phase
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/offline.html',
        '/manifest.json',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png',
        '/icons/apple-icon-152.png',
        '/icons/apple-icon-167.png',
        '/icons/apple-icon-180.png',
        '/icons/favicon-16x16.png',
        '/icons/favicon-32x32.png',
        '/icons/favicon-48x48.png',
        '/splash/apple-splash-1125-2436.png',
        '/splash/apple-splash-750-1334.png', 
        '/splash/apple-splash-1242-2208.png',
        '/splash/apple-splash-1284-2778.png',
        '/assets/index.css'
      ]);
    })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Clean up old caches during activation
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
  
  // Immediately claim clients so updated SW takes control
  self.clients.claim();
});

// Serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.open(CACHE_NAME)
            .then((cache) => {
              return cache.match(OFFLINE_URL);
            });
        })
    );
    return;
  }
  
  // For other requests (assets, API calls, etc.)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if available
        if (response) {
          return response;
        }
        
        // Clone the request since it can only be used once
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then((response) => {
            // Check for a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response since it can only be used once
            const responseToCache = response.clone();
            
            // Cache the fetched resource
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Don't cache API calls
                if (!event.request.url.includes('/api/')) {
                  cache.put(event.request, responseToCache);
                }
              });
            
            return response;
          })
          .catch(() => {
            // For API calls, return a custom offline response
            if (event.request.url.includes('/api/')) {
              return new Response(
                JSON.stringify({ 
                  error: 'You are offline. Please connect to the internet to access this feature.' 
                }),
                { 
                  headers: { 'Content-Type': 'application/json' } 
                }
              );
            }
          });
      })
  );
});