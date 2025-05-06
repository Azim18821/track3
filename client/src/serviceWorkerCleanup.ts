/**
 * Helper script to unregister service workers and clear browser caches
 * This helps ensure that changes take effect when developing
 */

// Add window interface declaration to support runServiceWorkerCleanup global
declare global {
  interface Window {
    runServiceWorkerCleanup: () => Promise<boolean>;
  }
}

// Type definitions for exported functions
export type CleanupFunction = () => Promise<number>;
export type RunCleanupFunction = () => Promise<boolean>;

// Unregister any existing service workers
async function unregisterServiceWorkers() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (let registration of registrations) {
      await registration.unregister();
      console.log('Service worker unregistered');
    }
    
    return registrations.length;
  }
  return 0;
}

// Clear all caches
async function clearCaches() {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(name => caches.delete(name))
    );
    console.log(`Cleared ${cacheNames.length} cache(s)`);
    return cacheNames.length;
  }
  return 0;
}

// Clear IndexedDB databases
async function clearIndexedDBs() {
  return new Promise((resolve) => {
    // Get all database names
    const databases = indexedDB.databases ? indexedDB.databases() : Promise.resolve([]);
    
    databases.then((dbs) => {
      // If the browser doesn't support databases(), try a known database name
      const dbNames = dbs.length > 0 
        ? dbs.map(db => db.name).filter((name): name is string => name !== undefined) 
        : ['trackMadeEasEOfflineDB'];
      
      let completed = 0;
      let deleted = 0;
      
      if (dbNames.length === 0) {
        resolve(0);
        return;
      }
      
      dbNames.forEach(name => {
        try {
          const request = indexedDB.deleteDatabase(name);
          
          request.onsuccess = () => {
            deleted++;
            completed++;
            if (completed === dbNames.length) {
              console.log(`Cleared ${deleted} IndexedDB database(s)`);
              resolve(deleted);
            }
          };
          
          request.onerror = () => {
            console.error(`Error deleting database ${name}`);
            completed++;
            if (completed === dbNames.length) {
              resolve(deleted);
            }
          };
        } catch (e) {
          console.error(`Exception when trying to delete ${name}`, e);
          completed++;
          if (completed === dbNames.length) {
            resolve(deleted);
          }
        }
      });
    });
  });
}

// Clear localStorage items related to offline functionality
function clearLocalStorage() {
  const keysToRemove = ['lastSync'];
  let removed = 0;
  
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      removed++;
    }
  });
  
  console.log(`Cleared ${removed} localStorage item(s)`);
  return removed;
}

// Run all cleanup functions
async function runCleanup() {
  try {
    const swCount = await unregisterServiceWorkers();
    const cacheCount = await clearCaches();
    const dbCount = await clearIndexedDBs();
    const lsCount = clearLocalStorage();
    
    console.log(`
      Cleanup complete!
      - ${swCount} service worker(s) unregistered
      - ${cacheCount} cache(s) cleared
      - ${dbCount} IndexedDB(s) cleared
      - ${lsCount} localStorage item(s) removed
    `);
    
    return true;
  } catch (error) {
    console.error('Cleanup failed:', error);
    return false;
  }
}

// Export for use in other files
export { 
  unregisterServiceWorkers,
  clearCaches,
  clearIndexedDBs,
  clearLocalStorage,
  runCleanup
};

// Export for global access
if (typeof window !== 'undefined') {
  window.runServiceWorkerCleanup = runCleanup;
  
  // Make the cleanup function available globally, but don't automatically run it
  // This prevents automatic cache clearing on every page load
}