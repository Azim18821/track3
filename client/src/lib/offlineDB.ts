// Offline storage utility using IndexedDB for offline-first capability

interface DBSchema {
  pendingRequests: {
    key: string;
    value: {
      url: string;
      method: string;
      body: any;
      timestamp: number;
    };
  };
  offlineData: {
    key: string;
    value: any;
  };
}

interface PendingRequest {
  id?: IDBValidKey;
  url: string;
  method: string;
  body: any;
  timestamp: number;
}

// Open the database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TrackMadeEazEDB', 1);
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB', event);
      reject(new Error('Could not open offline database'));
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores
      if (!db.objectStoreNames.contains('pendingRequests')) {
        db.createObjectStore('pendingRequests', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('offlineData')) {
        db.createObjectStore('offlineData', { keyPath: 'key' });
      }
    };
  });
}

// Add a pending request to sync later
export async function addPendingRequest(url: string, method: string, body: any): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(['pendingRequests'], 'readwrite');
    const store = transaction.objectStore('pendingRequests');
    
    const request: PendingRequest = {
      url,
      method,
      body,
      timestamp: Date.now(),
    };
    
    store.add(request);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject(event);
    });
  } catch (error) {
    console.error('Failed to add pending request', error);
    throw error;
  }
}

// Store data for offline use
export async function storeOfflineData(key: string, data: any): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(['offlineData'], 'readwrite');
    const store = transaction.objectStore('offlineData');
    
    store.put({ key, data });
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject(event);
    });
  } catch (error) {
    console.error('Failed to store offline data', error);
    throw error;
  }
}

// Get stored offline data
export async function getOfflineData(key: string): Promise<any> {
  try {
    const db = await openDB();
    const transaction = db.transaction(['offlineData'], 'readonly');
    const store = transaction.objectStore('offlineData');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result;
        resolve(result ? result.data : null);
      };
      
      request.onerror = (event) => reject(event);
    });
  } catch (error) {
    console.error('Failed to get offline data', error);
    throw error;
  }
}

// Process and sync all pending requests
export async function syncPendingItems(): Promise<void> {
  if (!navigator.onLine) {
    console.log("Device is offline, can't sync pending items");
    return;
  }
  
  try {
    const db = await openDB();
    const transaction = db.transaction(['pendingRequests'], 'readwrite');
    const store = transaction.objectStore('pendingRequests');
    
    let pendingRequests: PendingRequest[] = [];
    
    // Get all pending requests
    store.openCursor().onsuccess = async (event) => {
      const cursor = (event.target as IDBRequest).result;
      
      if (cursor) {
        pendingRequests.push({
          ...cursor.value,
          id: cursor.key,
        });
        cursor.continue();
      } else {
        // Process all pending requests
        for (const request of pendingRequests) {
          try {
            await processPendingRequest(request);
            if (request.id !== undefined) {
              await deletePendingRequest(request.id);
            }
          } catch (error) {
            console.error(`Failed to process request ${request.id}`, error);
            // Leave the request in the store to try again later
          }
        }
      }
    };
    
  } catch (error) {
    console.error('Error syncing pending items', error);
  }
}

// Process a single pending request
async function processPendingRequest(request: PendingRequest): Promise<Response> {
  const { url, method, body } = request;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  
  return response;
}

// Delete a pending request after it's processed
async function deletePendingRequest(id: IDBValidKey): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(['pendingRequests'], 'readwrite');
    const store = transaction.objectStore('pendingRequests');
    
    store.delete(id);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject(event);
    });
  } catch (error) {
    console.error('Failed to delete pending request', error);
    throw error;
  }
}

// Clear all offline data
export async function clearOfflineData(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(['offlineData'], 'readwrite');
    const store = transaction.objectStore('offlineData');
    
    store.clear();
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject(event);
    });
  } catch (error) {
    console.error('Failed to clear offline data', error);
    throw error;
  }
}