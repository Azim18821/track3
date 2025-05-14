import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Browser } from '@capacitor/browser';

/**
 * Checks if the app is running in a Capacitor native container
 * @returns boolean indicating if the app is running as a native app
 */
export function isNativeApp(): boolean {
  return (
    // @ts-ignore - window.Capacitor is injected by Capacitor runtime
    typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNative
  );
}

/**
 * Initializes Capacitor plugins and sets up event listeners
 * Only call this once at app startup
 * iOS-specific functionality has been removed
 */
export async function initializeCapacitor(): Promise<void> {
  if (!isNativeApp()) {
    // Not running in a native environment, skip initialization
    return;
  }

  try {
    // Hide the splash screen with a fade animation
    await SplashScreen.hide({
      fadeOutDuration: 500
    });

    // Set up back button handling for Android
    App.addListener('backButton', handleBackButton);
  } catch (error) {
    // Silent error handling
  }
}

/**
 * Handles the Android back button press
 * @param data Event data from Capacitor
 */
function handleBackButton() {
  // Get the current URL path
  const path = window.location.pathname;
  
  // If we're on the home screen or a top-level route, confirm exit
  if (path === '/' || path === '/auth') {
    confirmAppExit();
  } else {
    // Otherwise, navigate back
    window.history.back();
  }
}

/**
 * Shows a confirmation dialog before exiting the app
 */
async function confirmAppExit() {
  if (isNativeApp()) {
    const confirmed = window.confirm('Do you want to exit the app?');
    if (confirmed) {
      App.exitApp();
    }
  }
}

/**
 * Opens a URL externally
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (isNativeApp()) {
    try {
      await Browser.open({ url });
    } catch (error) {
      // Silent error handling in production
      window.open(url, '_blank');
    }
  } else {
    // Fallback for web
    window.open(url, '_blank');
  }
}