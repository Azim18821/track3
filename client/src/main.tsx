import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initCapacitor } from "./lib/capacitor";

// Register service worker for PWA
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/serviceWorker.js', { 
        scope: '/' 
      });
      console.log('Service worker registered successfully');
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }
};

// Advanced fix for iOS height calculation issues accounting for notches and home indicator
const setIOSFullHeight = () => {
  // First, get the viewport height and multiply it by 1% to get a value for a vh unit
  const vh = window.innerHeight * 0.01;
  // Then set the value in the --vh custom property to the root of the document
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  
  // Run on resize and orientation change with improved debounce
  let resizeTimeout: number | null = null;
  const updateVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    // Also adjust for safe areas
    document.documentElement.style.setProperty('--safe-area-inset-top', `env(safe-area-inset-top, 0px)`);
    document.documentElement.style.setProperty('--safe-area-inset-bottom', `env(safe-area-inset-bottom, 0px)`);
    document.documentElement.style.setProperty('--safe-area-inset-left', `env(safe-area-inset-left, 0px)`);
    document.documentElement.style.setProperty('--safe-area-inset-right', `env(safe-area-inset-right, 0px)`);
  };
  
  // Handle various events that might change the viewport
  window.addEventListener('resize', () => {
    if (resizeTimeout) {
      window.clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(updateVH, 50);
  });
  
  window.addEventListener('orientationchange', updateVH);
  window.addEventListener('load', updateVH);
  window.addEventListener('pageshow', updateVH);
  
  // Also update when DOM content is fully loaded
  document.addEventListener('DOMContentLoaded', updateVH);

  // Prevent all iOS bounce effects while allowing scrollable areas to work
  document.body.addEventListener('touchmove', (e) => {
    // Only prevent default if we're at the edge of the document
    const target = e.target as HTMLElement;
    const scrollable = 
      target.scrollHeight > target.clientHeight || 
      target.classList.contains('overflow-y-auto') || 
      target.classList.contains('scrollable');
      
    if (!scrollable || target === document.body || target.classList.contains('no-bounce')) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // Prevent pinch zoom
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  }, { passive: false });
  
  // Initialize immediately
  updateVH();
};

// Fix iOS pinch zooming issues
const disablePinchZoom = () => {
  // Add event listener to disable pinch zoom
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
    // Adding a return false for older iOS versions
    return false;
  }, { passive: false });
  
  document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
    return false;
  }, { passive: false });
  
  document.addEventListener('gestureend', (e) => {
    e.preventDefault();
    return false;
  }, { passive: false });
  
  // Also handle direct touch events
  document.addEventListener('touchmove', (e) => {
    // Only prevent if more than one touch point (pinch)
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
};

// Enhanced iOS detection with specific device recognition
const detectIOSPlatform = () => {
  // Check for iOS devices with multiple detection methods
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
               /iPhone|iPad|iPod/.test(navigator.platform) ||
               (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
               
  // Determine if in standalone mode (PWA)
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
  
  if (isIOS) {
    document.body.classList.add('ios-device');
    
    // Add class for standalone mode to enable specific PWA styles
    if (isInStandaloneMode) {
      document.body.classList.add('ios-standalone-mode');
      document.documentElement.classList.add('ios-standalone-mode');
    }
    
    // iOS viewport adjustment - ensure viewport covers the notch area
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    }
    
    // Detect iPhone model to apply specific fixes if needed
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const minDimension = Math.min(screenWidth, screenHeight);
    const maxDimension = Math.max(screenWidth, screenHeight);
    
    // Apply specific device classes based on screen dimensions
    if (minDimension <= 375 && maxDimension <= 812) {
      document.body.classList.add('iphone-x-class'); // iPhone X, XS, 11 Pro, etc.
    } else if (minDimension <= 414 && maxDimension <= 896) {
      document.body.classList.add('iphone-xr-class'); // iPhone XR, 11, etc.
    } else if (minDimension <= 428 && maxDimension <= 926) {
      document.body.classList.add('iphone-12-class'); // iPhone 12, 13, 14, etc.
    }
  }
};

// Initialize Capacitor if available
const initializeApp = async () => {
  // Register PWA service worker
  await registerServiceWorker();
  
  // Initialize Capacitor for native functionality
  await initCapacitor();
  
  // Fix iOS full screen issues
  setIOSFullHeight();
  
  // Detect iOS platform and apply fixes
  detectIOSPlatform();
  
  // Disable pinch zoom on iOS
  disablePinchZoom();
  
  console.log('App initialization complete');
};

// Start initialization process
initializeApp().catch(error => {
  console.error('Error during app initialization:', error);
});

// Admin-only cache management is now used instead of automatic cleanup
// Cleanup is now only done through admin interface to prevent automatic cache clearing

createRoot(document.getElementById("root")!).render(<App />);
