import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// Define states for service worker
export enum ServiceWorkerStatus {
  UNREGISTERED = 'unregistered',
  REGISTERED = 'registered',
  REGISTERING = 'registering',
  REGISTRATION_ERROR = 'registration_error',
  UPDATED = 'updated',
  UPDATING = 'updating',
  UPDATE_ERROR = 'update_error',
}

interface ServiceWorkerState {
  status: ServiceWorkerStatus;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

/**
 * A hook to register and manage service worker for offline functionality
 * Shows toast notifications for status changes
 */
export function useServiceWorker() {
  const { toast } = useToast();
  const [state, setState] = useState<ServiceWorkerState>({
    status: ServiceWorkerStatus.UNREGISTERED,
    registration: null,
    error: null,
  });

  // Network status state to track offline/online status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Register service worker on component mount
  useEffect(() => {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers are not supported in this browser');
      return;
    }

    // Update state when network status changes
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'You are back online',
        description: 'TrackMadeEazE is now syncing your data...',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'You are offline',
        description: 'Some features will be available in offline mode',
        variant: 'destructive',
      });
    };

    // Register listeners for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register service worker
    const registerServiceWorker = async () => {
      try {
        setState({
          ...state,
          status: ServiceWorkerStatus.REGISTERING,
        });

        // Register the service worker
        const registration = await navigator.serviceWorker.register('/serviceWorker.js');

        console.log('Service Worker registered with scope:', registration.scope);

        setState({
          status: ServiceWorkerStatus.REGISTERED,
          registration,
          error: null,
        });

        // Handle service worker updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;

          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('New content is available; please refresh.');
                  setState({
                    status: ServiceWorkerStatus.UPDATED,
                    registration,
                    error: null,
                  });

                  toast({
                    title: 'App update available',
                    description: 'Refresh to update TrackMadeEazE',
                    variant: 'default',
                  });
                } else {
                  console.log('Content is cached for offline use.');
                  toast({
                    title: 'Ready for offline use',
                    description: 'TrackMadeEazE will work even without internet',
                  });
                }
              }
            };
          }
        };
      } catch (error) {
        console.error('Error during service worker registration:', error);
        setState({
          status: ServiceWorkerStatus.REGISTRATION_ERROR,
          registration: null,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        toast({
          title: 'Offline mode unavailable',
          description: 'Could not enable offline functionality',
          variant: 'destructive',
        });
      }
    };

    registerServiceWorker();

    // Clean up event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Expose service worker state and network status
  return { swState: state, isOnline };
}