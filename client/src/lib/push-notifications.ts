import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';

// Check if we're running on a native platform
export const isNativePlatform = () => Capacitor.isNativePlatform();

// Initialize push notifications
export const initPushNotifications = async () => {
  if (!isNativePlatform()) {
    return false;
  }

  try {
    // Request permission to use push notifications
    const permission = await PushNotifications.requestPermissions();
    
    if (permission.receive !== 'granted') {
      return false;
    }

    // Register with the native platform to receive push notifications
    await PushNotifications.register();

    // Set up event listeners for push notifications
    PushNotifications.addListener('registration', token => {
      // Save the token to your server
      saveTokenToServer(token.value);
    });

    PushNotifications.addListener('registrationError', err => {
      // Error is handled silently
    });

    PushNotifications.addListener('pushNotificationReceived', notification => {
      // Notification is handled silently
    });

    PushNotifications.addListener('pushNotificationActionPerformed', notification => {
      // Action is handled silently
    });

    return true;
  } catch (error) {
    // Silently fail
    return false;
  }
};

// Save the device token to the server
const saveTokenToServer = async (token: string) => {
  try {
    await fetch('/api/push-notifications/register-device', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    // Success or failure is handled silently
  } catch (error) {
    // Error is handled silently
  }
};

// React hook for managing push notification permissions
// Type for our app's simplified permission states
type AppPermissionStatus = 'prompt' | 'granted' | 'denied' | 'unavailable';

// Helper function to convert Capacitor permission states to our app states
const mapToAppPermissionStatus = (capacitorStatus: string): AppPermissionStatus => {
  if (capacitorStatus === 'granted') return 'granted';
  if (capacitorStatus === 'denied') return 'denied';
  return 'prompt'; // Default for 'prompt', 'prompt-with-rationale', etc.
};

export const usePushNotifications = () => {
  const [permissionStatus, setPermissionStatus] = useState<AppPermissionStatus>('prompt');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Only run this effect on native platforms
    if (!isNativePlatform()) {
      setPermissionStatus('unavailable');
      return;
    }

    // Check if we already have permission
    const checkPermissions = async () => {
      try {
        const permission = await PushNotifications.checkPermissions();
        const mappedStatus = mapToAppPermissionStatus(permission.receive);
        setPermissionStatus(mappedStatus);
      } catch (error) {
        // Default to prompt if we encounter an error
        setPermissionStatus('prompt');
      }
    };

    // Set up listeners for token updates
    const setupListeners = async () => {
      PushNotifications.addListener('registration', (tokenInfo) => {
        setToken(tokenInfo.value);
      });
    };

    checkPermissions();
    setupListeners();

    // Initialize push notifications if permission is granted
    if (permissionStatus === 'granted') {
      initPushNotifications();
    }
  }, [permissionStatus]);

  // Function to request permissions
  const requestPermissions = async () => {
    if (!isNativePlatform()) {
      return false;
    }

    try {
      const permission = await PushNotifications.requestPermissions();
      const mappedStatus = mapToAppPermissionStatus(permission.receive);
      setPermissionStatus(mappedStatus);
      
      if (mappedStatus === 'granted') {
        await PushNotifications.register();
        return true;
      }
      return false;
    } catch (error) {
      // Silent error handling
      return false;
    }
  };

  return {
    permissionStatus,
    token,
    requestPermissions,
    isAvailable: isNativePlatform()
  };
};

// Function to handle notification subscriptions for specific topics
export const subscribeToTopic = async (topic: 'workout_reminders' | 'meal_reminders' | 'plan_updates') => {
  if (!isNativePlatform()) return false;
  
  try {
    const response = await fetch(`/api/push-notifications/subscribe/${topic}`, {
      method: 'POST',
    });
    return response.ok;
  } catch (error) {
    // Silently handle errors
    return false;
  }
};

export const unsubscribeFromTopic = async (topic: 'workout_reminders' | 'meal_reminders' | 'plan_updates') => {
  if (!isNativePlatform()) return false;
  
  try {
    const response = await fetch(`/api/push-notifications/unsubscribe/${topic}`, {
      method: 'POST',
    });
    return response.ok;
  } catch (error) {
    // Silently handle errors
    return false;
  }
};