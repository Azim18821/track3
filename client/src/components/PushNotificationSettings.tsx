import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, BellOff } from 'lucide-react';
import { 
  usePushNotifications, 
  subscribeToTopic, 
  unsubscribeFromTopic,
  isNativePlatform
} from '@/lib/push-notifications';
import { cn } from '@/lib/utils';

// Define the shape of the notification preferences
interface NotificationPreferences {
  workoutReminders: boolean;
  mealReminders: boolean;
  planUpdates: boolean;
}

export function PushNotificationSettings() {
  const { permissionStatus, requestPermissions, isAvailable } = usePushNotifications();
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    workoutReminders: false,
    mealReminders: false,
    planUpdates: true, // Enable by default
  });

  // Fetch current notification preferences from the server
  useEffect(() => {
    if (!isAvailable) {
      setIsLoading(false);
      return;
    }

    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/push-notifications/settings');
        if (response.ok) {
          const data = await response.json();
          setPreferences(data);
        }
      } catch (error) {
        // Silent error handling - default preferences will be used
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [isAvailable]);

  // Handle permission request
  const handleRequestPermission = async () => {
    await requestPermissions();
  };

  // Handle toggle changes
  const handleToggle = async (
    topic: 'workout_reminders' | 'meal_reminders' | 'plan_updates', 
    prefKey: keyof NotificationPreferences,
    enabled: boolean
  ) => {
    // Optimistically update UI
    setPreferences((prev) => ({
      ...prev,
      [prefKey]: enabled,
    }));

    // Update on server
    try {
      if (enabled) {
        await subscribeToTopic(topic);
      } else {
        await unsubscribeFromTopic(topic);
      }
    } catch (error) {
      // Silent error handling
      
      // Revert on failure
      setPreferences((prev) => ({
        ...prev,
        [prefKey]: !enabled,
      }));
    }
  };

  // If push notifications are not available on this platform
  if (!isAvailable) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Push notifications are not available in your browser. 
            Install our mobile app for notifications.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>Loading your notification preferences...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Permission needed state
  if (permissionStatus !== 'granted') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Enable push notifications to receive updates about your fitness journey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-4">
            <Bell className="h-12 w-12 text-primary" />
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Get notified when your workout is scheduled, meal times arrive, 
              or when your new fitness plan is ready!
            </p>
            <Button 
              onClick={handleRequestPermission} 
              disabled={permissionStatus === 'denied'}
              variant="default"
              className="mt-2"
            >
              {permissionStatus === 'denied' 
                ? 'Notifications Blocked' 
                : 'Enable Notifications'}
            </Button>
            {permissionStatus === 'denied' && (
              <p className="text-xs text-muted-foreground text-center">
                Please enable notifications in your device settings.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fully enabled state with toggles
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Push Notifications</CardTitle>
            <CardDescription>
              Customize which notifications you want to receive
            </CardDescription>
          </div>
          <Bell className={cn(
            "h-6 w-6", 
            Object.values(preferences).some(v => v) 
              ? "text-primary" 
              : "text-muted-foreground"
          )} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="workout-reminders">Workout Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when it's time for your scheduled workouts
              </p>
            </div>
            <Switch
              id="workout-reminders"
              checked={preferences.workoutReminders}
              onCheckedChange={(checked) => 
                handleToggle('workout_reminders', 'workoutReminders', checked)
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="meal-reminders">Meal Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get notified at your scheduled meal times
              </p>
            </div>
            <Switch
              id="meal-reminders"
              checked={preferences.mealReminders}
              onCheckedChange={(checked) => 
                handleToggle('meal_reminders', 'mealReminders', checked)
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="plan-updates">Plan Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when your new fitness plan is ready
              </p>
            </div>
            <Switch
              id="plan-updates"
              checked={preferences.planUpdates}
              onCheckedChange={(checked) => 
                handleToggle('plan_updates', 'planUpdates', checked)
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}