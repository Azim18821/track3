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

// Fix for iOS height calculation issues
const setIOSFullHeight = () => {
  // First, get the viewport height and multiply it by 1% to get a value for a vh unit
  const vh = window.innerHeight * 0.01;
  // Then set the value in the --vh custom property to the root of the document
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  
  // Run on resize and orientation change with debounce
  let resizeTimeout: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimeout) {
      window.clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(() => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }, 100);
  });
  
  window.addEventListener('orientationchange', () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  });

  // Prevent all iOS bounce effects
  document.body.addEventListener('touchmove', (e) => {
    // Check if this is the body being touched and not an inner scrollable element
    if (e.target === document.body || (e.target as HTMLElement).classList.contains('no-bounce')) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // Prevent pinch zoom
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  }, { passive: false });
  
  // We're not locking orientation here - that's handled in Capacitor's native layer
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

// Add class to body for iOS detection
const detectIOSPlatform = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  if (isIOS) {
    document.body.classList.add('ios-device');
    // iOS viewport adjustment
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, height=device-height');
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
