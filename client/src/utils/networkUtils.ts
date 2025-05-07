/**
 * Network Utilities for Mobile and Web
 * Ensures consistent API URL construction across the application
 */

import { API_URL, isNative } from './env';

/**
 * Builds a complete API URL with the proper base URL for the current environment
 * This ensures mobile applications connect to the correct backend
 * 
 * @param path - API path (should start with /)
 * @returns Full URL including base and path
 */
export function buildApiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // If we have a custom API_URL from env or localStorage, use it
  if (API_URL) {
    // Remove trailing slash from base URL if present
    const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    return `${base}${normalizedPath}`;
  }
  
  // In native mobile apps, we need a full URL
  if (isNative) {
    // Default to production URL if nothing else is specified
    return `https://www.trackmadeaze.com${normalizedPath}`;
  }
  
  // In browser, we can use relative URLs (current origin)
  return normalizedPath;
}

/**
 * Enhanced fetch function that uses the correct API URL
 * 
 * @param path - API path (should start with /)
 * @param options - Fetch options
 * @returns Fetch response
 */
export async function apiFetch(
  path: string, 
  options: RequestInit = {}
): Promise<Response> {
  const url = buildApiUrl(path);
  
  // Always include credentials for cookies/session
  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include'
  };
  
  // Log API requests in development
  if (import.meta.env.DEV) {
    console.log(`API Request: ${options.method || 'GET'} ${url}`);
  }
  
  try {
    return await fetch(url, fetchOptions);
  } catch (error) {
    console.error(`Network error for ${url}:`, error);
    throw error;
  }
}