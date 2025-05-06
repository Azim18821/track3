// Offline API handling using IndexedDB for offline-first capability
import { addPendingRequest, getOfflineData, storeOfflineData } from './offlineDB';

// Network status tracking to know when app is online or offline
interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineTime: number | null;
  listeners: Array<(isOnline: boolean) => void>;
}

// Initialize network status state
export function getNetworkStatus(): NetworkStatus {
  const status: NetworkStatus = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastOnlineTime: typeof navigator !== 'undefined' && navigator.onLine ? Date.now() : null,
    listeners: [],
  };
  
  if (typeof window !== 'undefined') {
    // Update status when online/offline changes
    window.addEventListener('online', () => {
      status.isOnline = true;
      status.wasOffline = true;
      status.lastOnlineTime = Date.now();
      status.listeners.forEach(listener => listener(true));
    });
    
    window.addEventListener('offline', () => {
      status.isOnline = false;
      status.wasOffline = false;
      status.listeners.forEach(listener => listener(false));
    });
  }
  
  return status;
}

// API methods that can be performed offline
const CACHEABLE_METHODS = ['GET'];

// API methods that should be queued when offline
const QUEUEABLE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Resource paths that should support offline functionality
const OFFLINE_ENABLED_PATHS = [
  '/api/workouts',
  '/api/weight-logs',
  '/api/meals',
  '/api/exercise-logs',
];

// Check if a request should use offline functionality
function shouldHandleOffline(method: string, url: string): boolean {
  const isOfflineEnabledPath = OFFLINE_ENABLED_PATHS.some(path => url.startsWith(path));
  const isCacheable = CACHEABLE_METHODS.includes(method) && isOfflineEnabledPath;
  const isQueueable = QUEUEABLE_METHODS.includes(method) && isOfflineEnabledPath;
  
  return isCacheable || isQueueable;
}

// Generate a cache key for storing/retrieving data
function generateCacheKey(method: string, url: string): string {
  return `${method}:${url}`;
}

// Extract a resource ID from a URL
function extractIdFromUrl(url: string): string | null {
  const match = url.match(/\/([0-9]+)(?:\/|$)/);
  return match ? match[1] : null;
}

// The main offline API request handler
export async function offlineApiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: any
): Promise<any> {
  // If we're online, try to perform the request online first
  if (navigator.onLine) {
    try {
      const response = await fetch(url, {
        method,
        headers: data ? { 'Content-Type': 'application/json' } : {},
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorMessage = response.statusText;
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }
      
      const result = await response.json();
      
      // Cache successful GET responses for offline use
      if (method === 'GET' && shouldHandleOffline(method, url)) {
        const cacheKey = generateCacheKey(method, url);
        await storeOfflineData(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      // If online request fails and offline handling is enabled, fall back to offline mode
      if (shouldHandleOffline(method, url)) {
        return handleOfflineRequest(method, url, data);
      }
      throw error;
    }
  } else {
    // We're offline, handle according to offline strategy
    if (shouldHandleOffline(method, url)) {
      return handleOfflineRequest(method, url, data);
    }
    
    // Not offline-enabled, throw error
    throw new Error('This operation is not available while offline');
  }
}

// Handle requests in offline mode
async function handleOfflineRequest(
  method: string,
  url: string,
  data?: any
): Promise<any> {
  // For GET requests, fetch from cache
  if (method === 'GET') {
    const cacheKey = generateCacheKey(method, url);
    const cachedData = await getOfflineData(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    throw new Error(`No cached data available for ${url}`);
  }
  
  // For write operations (POST/PUT/PATCH/DELETE), queue the request for later sync
  if (QUEUEABLE_METHODS.includes(method)) {
    await addPendingRequest(url, method, data);
    
    // Return a mock response with optimistic UI updates
    // For POST, return the created item with a temporary ID
    if (method === 'POST') {
      return {
        ...data,
        id: `temp_${Date.now()}`,
        _offlineCreated: true,
        _pendingSync: true,
      };
    }
    
    // For PUT/PATCH, return the updated data
    if (method === 'PUT' || method === 'PATCH') {
      const resourceId = extractIdFromUrl(url);
      return {
        ...data,
        id: resourceId,
        _offlineUpdated: true,
        _pendingSync: true,
      };
    }
    
    // For DELETE, return success indicator
    if (method === 'DELETE') {
      return {
        success: true,
        _offlineDeleted: true,
        _pendingSync: true,
      };
    }
  }
  
  throw new Error(`Method ${method} is not supported offline`);
}