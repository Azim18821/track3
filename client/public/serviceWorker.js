// Service Worker for TrackMadeEasE
const CACHE_NAME = 'trackmadease-v1';
const DYNAMIC_CACHE = 'trackmadease-dynamic-v1';

// Assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js',
  '/offline.html',
  '/icons/app-icon.svg',
  '/icons/splash-screen.svg',
  '/offline-image.svg',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('Service Worker: Clearing old cache', name);
            return caches.delete(name);
          })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // API request handling (with network-first strategy)
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response to store in cache
          const responseToCache = response.clone();
          
          caches.open(DYNAMIC_CACHE)
            .then((cache) => {
              // Only cache successful responses
              if (response.status === 200) {
                cache.put(event.request, responseToCache);
              }
            });
            
          return response;
        })
        .catch((error) => {
          console.log('Service Worker: Fetching from cache due to offline state', error);
          return caches.match(event.request)
            .then((cacheResponse) => {
              // If found in cache, return it
              if (cacheResponse) {
                return cacheResponse;
              }
              
              // For API requests we can't fulfill offline, return a custom response
              return new Response(
                JSON.stringify({ 
                  error: true, 
                  message: 'You are currently offline. This data requires an internet connection.' 
                }),
                { 
                  headers: { 'Content-Type': 'application/json' } 
                }
              );
            });
        })
    );
  } else {
    // Static assets and other requests (cache-first strategy)
    event.respondWith(
      caches.match(event.request)
        .then((cacheResponse) => {
          return cacheResponse || fetch(event.request)
            .then((response) => {
              return caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(event.request, response.clone());
                  return response;
                });
            });
        })
        .catch(() => {
          // Fallback for images or other non-critical assets
          if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
            return caches.match('/offline-image.svg');
          }
          return caches.match('/offline.html');
        })
    );
  }
});

// Listen for the 'sync' event to process queued actions
self.addEventListener('sync', (event) => {
  console.log('Background sync event received:', event.tag);
  
  // Use simpler tag naming to avoid errors
  if (event.tag === 'sync-data') {
    event.waitUntil(
      Promise.all([
        syncWorkouts(),
        syncNutrition()
      ])
    );
  }
});

// Process syncing of workout data
async function syncWorkouts() {
  try {
    const db = await openIndexedDB();
    const pendingWorkouts = await db.getAll('pendingWorkouts');
    
    for (const workout of pendingWorkouts) {
      const response = await fetch(`/api/workouts${workout.id ? `/${workout.id}` : ''}`, {
        method: workout.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workout.data)
      });
      
      if (response.ok) {
        await db.delete('pendingWorkouts', workout.id);
      }
    }
  } catch (error) {
    console.error('Sync workouts failed:', error);
  }
}

// Process syncing of nutrition data
async function syncNutrition() {
  try {
    const db = await openIndexedDB();
    const pendingNutrition = await db.getAll('pendingNutrition');
    
    for (const meal of pendingNutrition) {
      const response = await fetch(`/api/nutrition/meals${meal.id ? `/${meal.id}` : ''}`, {
        method: meal.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meal.data)
      });
      
      if (response.ok) {
        await db.delete('pendingNutrition', meal.id);
      }
    }
  } catch (error) {
    console.error('Sync nutrition failed:', error);
  }
}

// Helper function to open IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TrackMadeEaseOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create stores for pending items
      if (!db.objectStoreNames.contains('pendingWorkouts')) {
        db.createObjectStore('pendingWorkouts', { keyPath: 'localId', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('pendingNutrition')) {
        db.createObjectStore('pendingNutrition', { keyPath: 'localId', autoIncrement: true });
      }
      
      // Create stores for cached data
      if (!db.objectStoreNames.contains('cachedWorkouts')) {
        db.createObjectStore('cachedWorkouts', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('cachedNutrition')) {
        db.createObjectStore('cachedNutrition', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('cachedExercises')) {
        db.createObjectStore('cachedExercises', { keyPath: 'id' });
      }
    };
  });
}