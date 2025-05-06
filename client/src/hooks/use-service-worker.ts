import { useState, useEffect } from 'react';

export type ServiceWorkerState = 'unsupported' | 'pending' | 'registered' | 'error';

interface UseServiceWorkerResult {
  /**
   * Current state of the service worker
   */
  swState: ServiceWorkerState;
  
  /**
   * Any error that occurred during service worker registration
   */
  error: Error | null;
}

/**
 * Hook for monitoring service worker registration state
 */
export function useServiceWorker(): UseServiceWorkerResult {
  const [swState, setSwState] = useState<ServiceWorkerState>('pending');
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers are not supported in this browser');
      setSwState('unsupported');
      return;
    }
    
    navigator.serviceWorker.ready
      .then(() => {
        console.log('Service worker is active');
        setSwState('registered');
      })
      .catch((err) => {
        console.error('Service worker ready error:', err);
        setError(err);
        setSwState('error');
      });
      
    // Listen for controller change events
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service worker controller changed');
    });
    
    // Listen for any service worker errors
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'ERROR') {
        console.error('Service worker error:', event.data.error);
        setError(new Error(event.data.error));
        setSwState('error');
      }
    });
  }, []);
  
  return { swState, error };
}