/**
 * Environment Variables Helper
 * 
 * This file provides a centralized way to access environment variables 
 * across both web and mobile (iOS/Android) builds.
 */

// Helper to detect device/platform type
function detectPlatform() {
  if (typeof window === 'undefined') {
    return {
      isIOS: false,
      isAndroid: false,
      isNative: false,
      isWeb: true
    };
  }
  
  const isIOS = window.navigator.userAgent.includes('iPhone') || 
                window.navigator.userAgent.includes('iPad') || 
                /FxiOS/.test(window.navigator.userAgent);
  
  const isAndroid = /android/i.test(window.navigator.userAgent);
  const isNative = isIOS || isAndroid;
  const isWeb = !isNative;
  
  return { isIOS, isAndroid, isNative, isWeb };
}

// Export platform detection values
const { isIOS, isAndroid, isNative, isWeb } = detectPlatform();
export { isIOS, isAndroid, isNative, isWeb };

// Helper to get environment variables with fallbacks
export function getEnv(key: string, fallback: string = ''): string {
  // For Vite builds (web and Capacitor)
  if (import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  
  // Fallback value
  return fallback;
}

// Get base URL for API calls
function getBaseUrl(): string {
  // Check for a custom API URL in localStorage - useful for development/testing
  if (typeof window !== 'undefined' && window.localStorage.getItem('custom_api_url')) {
    return window.localStorage.getItem('custom_api_url') || '';
  }
  
  // For native environments
  if (isNative) {
    // Default production API for mobile apps
    const defaultMobileApi = 'https://www.trackmadeaze.com';
    
    // Allow environment variable override 
    return getEnv('VITE_MOBILE_API_URL', defaultMobileApi);
  }
  
  // For web environments
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback (server-side rendering)
  return '';
}

// API environment
export const API_URL = getEnv('VITE_API_URL', getBaseUrl());
export const ENV = getEnv('VITE_ENV', 'production');

// API keys
export const NUTRITIONIX_APP_ID = getEnv('VITE_NUTRITIONIX_APP_ID', '');
export const NUTRITIONIX_API_KEY = getEnv('VITE_NUTRITIONIX_API_KEY', '');
export const GOOGLE_CLOUD_VISION_API_KEY = getEnv('VITE_GOOGLE_CLOUD_VISION_API_KEY', '');

// Additional environment helpers
export const isDevelopment = ENV === 'development';
export const isProduction = ENV === 'production';