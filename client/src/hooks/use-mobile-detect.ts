import { useState, useEffect } from 'react';

/**
 * A hook to detect if the current device is mobile based on screen width
 * @returns boolean indicating if the device is mobile
 */
export default function useMobileDetect(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Set up event listener
    window.addEventListener('resize', handleResize);
    
    // Call once to set initial value
    handleResize();
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}