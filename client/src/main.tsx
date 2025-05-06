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
  
  // Also run on resize and orientation change
  window.addEventListener('resize', () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  });

  // Prevent iOS bounce effect
  document.body.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
};

// Initialize Capacitor if available
const initializeApp = async () => {
  // Register PWA service worker
  await registerServiceWorker();
  
  // Initialize Capacitor for native functionality
  await initCapacitor();
  
  // Fix iOS full screen issues
  setIOSFullHeight();
  
  console.log('App initialization complete');
};

// Start initialization process
initializeApp().catch(error => {
  console.error('Error during app initialization:', error);
});

// Admin-only cache management is now used instead of automatic cleanup
// Cleanup is now only done through admin interface to prevent automatic cache clearing

createRoot(document.getElementById("root")!).render(<App />);
