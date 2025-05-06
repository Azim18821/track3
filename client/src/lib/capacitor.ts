import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Check if the app is running natively in Capacitor
 */
export const isNative = () => Capacitor.isNativePlatform();

/**
 * Get the current platform
 */
export const getPlatform = () => Capacitor.getPlatform();

/**
 * Initialize Capacitor app
 * - Set up event listeners for app state changes
 * - Hide the splash screen
 */
export const initCapacitor = async () => {
  // Only initialize if running in native app
  if (!isNative()) {
    return;
  }

  try {
    // Set up app state change listeners
    App.addListener('appStateChange', ({ isActive }) => {
      // App state has changed, but we don't need to log it
    });

    // Hide splash screen
    await SplashScreen.hide();
  } catch (error) {
    // Silently handle errors - we don't want to crash the app
  }
};

/**
 * Get app info
 */
export const getAppInfo = async () => {
  if (!isNative()) return null;
  
  try {
    const info = await App.getInfo();
    return info;
  } catch (error) {
    // Silently handle errors
    return null;
  }
};

/**
 * Exit the app
 */
export const exitApp = async () => {
  if (!isNative()) {
    return;
  }
  
  try {
    await App.exitApp();
  } catch (error) {
    // Silently handle errors
  }
};