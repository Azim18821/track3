import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the current viewport is mobile sized
 * @returns boolean indicating if the screen is mobile-sized
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Initial check
    checkIsMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Function to check if screen is mobile-sized
  function checkIsMobile() {
    setIsMobile(window.innerWidth < 768); // Standard mobile breakpoint
  }

  return isMobile;
}