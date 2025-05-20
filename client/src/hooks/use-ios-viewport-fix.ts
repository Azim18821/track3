import { useEffect } from 'react';

/**
 * Custom hook to fix iOS viewport height issues in standalone mode and Safari
 * This addresses the inconsistent viewport heights on iOS Safari and PWA
 */
export function useIOSViewportFix() {
  useEffect(() => {
    // Check if running on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                  
    if (!isIOS) return;
    
    // Function to set the CSS vh variable based on the actual viewport height
    const setViewportHeight = () => {
      // First get the viewport height
      const vh = window.innerHeight * 0.01;
      // Set the value in the --vh custom property
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    // Set initial height
    setViewportHeight();
    
    // Update on resize, orientation change, scroll, and focus events
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
    window.addEventListener('scroll', setViewportHeight);
    
    // Also add scroll fix for iOS 
    document.addEventListener('touchmove', (e) => {
      if (e.target === document.documentElement) {
        e.preventDefault();
      }
    }, { passive: false });
    
    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
      window.removeEventListener('scroll', setViewportHeight);
      
      document.removeEventListener('touchmove', (e) => {
        if (e.target === document.documentElement) {
          e.preventDefault();
        }
      });
    };
  }, []);
}

export default useIOSViewportFix;