import { useState, useEffect } from 'react';

interface UsePwaResult {
  /**
   * Whether the browser supports PWA installation
   */
  canInstall: boolean;
  
  /**
   * Whether the app is running in standalone mode (installed as PWA)
   */
  isStandalone: boolean;
  
  /**
   * Whether the device is online
   */
  isOnline: boolean;
  
  /**
   * Trigger the installation prompt
   */
  install: () => Promise<boolean>;
}

/**
 * Hook for handling PWA features
 */
export function usePwa(): UsePwaResult {
  // Track whether the app can be installed
  const [canInstall, setCanInstall] = useState<boolean>(false);
  
  // Track whether the app is in standalone mode (installed)
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  
  // Track online status
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  // Store the deferred installation prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  useEffect(() => {
    // Check if the app is running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(standalone);
    
    // Check if the device is online
    setIsOnline(navigator.onLine);
    
    // Listen for beforeinstallprompt event to capture the installation prompt
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent default behavior
      e.preventDefault();
      
      // Store the event for later use
      setDeferredPrompt(e);
      
      // Update state to indicate the app can be installed
      setCanInstall(true);
    };
    
    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    // Listen for app already installed events
    const handleAppInstalled = () => {
      setCanInstall(false);
      setIsStandalone(true);
      setDeferredPrompt(null);
    };
    
    // Listen for display mode changes
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    
    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', handleDisplayModeChange);
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', handleDisplayModeChange);
    };
  }, []);
  
  /**
   * Trigger the installation prompt
   */
  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    
    try {
      // Show the installation prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const choiceResult = await deferredPrompt.userChoice;
      
      // Clear the saved prompt
      setDeferredPrompt(null);
      
      // Update canInstall based on user choice
      if (choiceResult.outcome === 'accepted') {
        setCanInstall(false);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error during installation:', error);
      return false;
    }
  };
  
  return {
    canInstall,
    isStandalone,
    isOnline,
    install,
  };
}