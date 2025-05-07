/**
 * API Configuration for Mobile and Web Development
 * 
 * This file centralizes API URL configuration for both web and mobile environments.
 * For iOS development, you must use your Mac's IP address (not localhost).
 */

// For local iOS testing, change this to your Mac's IP address (e.g., "192.168.1.xxx")
// You can find your IP by running "ifconfig" in the terminal
const LOCAL_DEV_MAC_IP = "192.168.1.xxx";

// The port your local development server runs on
const LOCAL_PORT = 5000;

// Builds the base URL for the API
function getBaseApiUrl(): string {
  // Check for environment variable first (used during builds)
  if (import.meta.env.VITE_MOBILE_API_URL) {
    return import.meta.env.VITE_MOBILE_API_URL as string;
  }
  
  // Check for a localStorage override (useful for testing)
  if (typeof window !== 'undefined' && window.localStorage.getItem('api_url')) {
    return window.localStorage.getItem('api_url') || '';
  }
  
  // Check if we're running in a native mobile environment
  const isNative = typeof window !== 'undefined' && 
    (window.navigator.userAgent.includes('iPhone') || 
     window.navigator.userAgent.includes('iPad') || 
     /FxiOS/.test(window.navigator.userAgent) ||
     /android/i.test(window.navigator.userAgent));

  // For native mobile apps in development
  if (isNative && import.meta.env.DEV) {
    return `http://${LOCAL_DEV_MAC_IP}:${LOCAL_PORT}`;
  }
  
  // For production mobile apps
  if (isNative) {
    return 'https://www.trackmadeaze.com';
  }
  
  // For web development, we can use relative URLs
  return '';
}

/**
 * Creates a complete URL for API requests
 * @param path - API endpoint path (should start with /)
 * @returns Full URL to use for fetch() requests
 */
export function buildApiUrl(path: string): string {
  const baseUrl = getBaseApiUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  if (baseUrl) {
    // Remove trailing slash from base URL if it exists
    const cleanBase = baseUrl.endsWith('/') 
      ? baseUrl.slice(0, -1) 
      : baseUrl;
      
    return `${cleanBase}${cleanPath}`;
  }
  
  return cleanPath; // For web, just use relative paths
}

/**
 * Updates the API URL in localStorage
 * Useful for testing different API endpoints in development
 */
export function setCustomApiUrl(url: string | null): void {
  if (!url) {
    localStorage.removeItem('api_url');
  } else {
    localStorage.setItem('api_url', url);
  }
  
  // Force reload to apply changes
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

// Expose whether we're in a native environment
export const isNative = typeof window !== 'undefined' && 
  (window.navigator.userAgent.includes('iPhone') || 
   window.navigator.userAgent.includes('iPad') || 
   /FxiOS/.test(window.navigator.userAgent) ||
   /android/i.test(window.navigator.userAgent));

export const isIOS = typeof window !== 'undefined' && 
  (window.navigator.userAgent.includes('iPhone') || 
   window.navigator.userAgent.includes('iPad') || 
   /FxiOS/.test(window.navigator.userAgent));

export const isAndroid = typeof window !== 'undefined' && 
  /android/i.test(window.navigator.userAgent);

// Export the current API base URL
export const API_BASE_URL = getBaseApiUrl();