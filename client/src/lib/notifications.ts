import { PushNotifications } from '@capacitor/push-notifications';
import { isNative } from './capacitor';
import { toast } from '@/hooks/use-toast';

// Flag to check if notifications have been initialized
let notificationsInitialized = false;

/**
 * Initialize push notifications for native platforms
 * This should be called once when the app starts
 */
export async function initPushNotifications() {
  // Only initialize once and only on native platforms
  if (notificationsInitialized || !isNative()) {
    return;
  }

  try {
    // Request permission to use push notifications
    // iOS will prompt user and return if they granted permission or not
    // Android will just grant without prompting
    const permStatus = await PushNotifications.requestPermissions();
    
    if (permStatus.receive === 'granted') {
      // Register with Apple / Google to receive push notifications
      await PushNotifications.register();
      notificationsInitialized = true;
    }

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', (token) => {
      // Send this token to your server for this user
      saveDeviceToken(token.value);
    });

    // Some issue with registration
    PushNotifications.addListener('registrationError', () => {
      // Silent handling of registration errors
    });

    // Show notifications when they come in while the app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      // Show a toast for foreground notifications
      toast({
        title: notification.title || 'New notification',
        description: notification.body || '',
        duration: 5000,
      });
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      // Handle navigation based on notification data
      handleNotificationAction(notification.notification.data);
    });

  } catch (error) {
    // Silent error handling
  }
}

/**
 * Save device token to server for sending push notifications
 */
async function saveDeviceToken(token: string) {
  try {
    const response = await fetch('/api/notifications/register-device', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    // We don't need to do anything with the response
    // Success or failure is handled silently
  } catch (error) {
    // Silent error handling
  }
}

/**
 * Handle notification action (when user taps on a notification)
 */
function handleNotificationAction(data: any) {
  if (!data) return;
  
  // Navigate based on notification type
  if (data.type === 'message') {
    // Navigate to messages with specific conversation
    window.location.href = `/messages/${data.conversationId}`;
  } else if (data.type === 'trainer_request') {
    // Navigate to trainer requests page
    window.location.href = '/trainer-requests';
  } else if (data.type === 'plan_update') {
    // Navigate to fitness plan page
    window.location.href = '/fitness-plan';
  } else {
    // Default navigation to notifications list
    window.location.href = '/notifications';
  }
}

/**
 * Show a local notification on the device
 * This can be used for notifications that don't come from the server
 */
export function showLocalNotification(title: string, body: string, data: any = {}) {
  if (!isNative()) {
    // For web, just show a toast notification
    toast({
      title,
      description: body,
      duration: 5000,
    });
    return;
  }
  
  // For native platforms, we can implement local notifications if needed
  // This would typically use the Local Notifications plugin
  // For now, we'll just use toast notifications
  toast({
    title,
    description: body,
    duration: 5000,
  });
}

/**
 * Get badge count for the app icon
 */
export async function getNotificationBadgeCount(): Promise<number> {
  if (!isNative()) return 0;
  
  try {
    // This would require the Badge plugin
    // For now, we'll just return a placeholder
    return 0;
  } catch (error) {
    // Silent error handling
    return 0;
  }
}

/**
 * Set badge count for the app icon
 */
export async function setNotificationBadgeCount(count: number): Promise<void> {
  if (!isNative()) return;
  
  try {
    // This would require the Badge plugin
    // No need to log the count
  } catch (error) {
    // Silent error handling
  }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  if (!isNative()) return;
  
  try {
    await PushNotifications.removeAllDeliveredNotifications();
    // No need to log success
  } catch (error) {
    // Silent error handling
  }
}