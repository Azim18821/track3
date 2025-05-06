/**
 * Environment Variables Helper
 * 
 * This file provides a centralized way to access environment variables 
 * across both web and mobile (iOS/Android) builds.
 */

// Helper to get environment variables with fallbacks
export function getEnv(key: string, fallback: string = ''): string {
  // For Vite builds (web and Capacitor)
  if (import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  
  // Fallback value
  return fallback;
}

// API environment
export const API_URL = getEnv('VITE_API_URL', 'https://www.trackmadeaze.com');
export const ENV = getEnv('VITE_ENV', 'production');

// API keys
export const NUTRITIONIX_APP_ID = getEnv('VITE_NUTRITIONIX_APP_ID', '');
export const NUTRITIONIX_API_KEY = getEnv('VITE_NUTRITIONIX_API_KEY', '');
export const GOOGLE_CLOUD_VISION_API_KEY = getEnv('VITE_GOOGLE_CLOUD_VISION_API_KEY', '');

// Environment detection helpers
export const isDevelopment = ENV === 'development';
export const isProduction = ENV === 'production';
export const isIOS = window.navigator.userAgent.includes('iPhone') || 
                     window.navigator.userAgent.includes('iPad') || 
                     /FxiOS/.test(window.navigator.userAgent);
export const isAndroid = /android/i.test(window.navigator.userAgent);
export const isNative = isIOS || isAndroid;
export const isWeb = !isNative;