import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * Component that shows a banner when the user is offline
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(!navigator.onLine);
  
  useEffect(() => {
    // Function to update online status
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (!online) {
        // Show offline indicator immediately when going offline
        setShowIndicator(true);
      } else {
        // When going online, show a "Back Online" message briefly
        setShowIndicator(true);
        // Hide after 3 seconds
        const timer = setTimeout(() => {
          setShowIndicator(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
    };
    
    // Add event listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Cleanup
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);
  
  // If we're online and not showing the indicator, return null
  if (isOnline && !showIndicator) {
    return null;
  }
  
  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out transform ${
        showIndicator ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ 
        paddingBottom: '0',
        paddingLeft: '0',
        paddingRight: '0'
      }}
    >
      <div 
        className={`px-4 py-3 flex items-center justify-center ${
          isOnline 
            ? 'bg-green-500 text-white' 
            : 'bg-amber-500 text-white'
        }`}
      >
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <span className="font-medium">Back online! Syncing data...</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span className="font-medium">You're offline. Some features may be unavailable.</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}