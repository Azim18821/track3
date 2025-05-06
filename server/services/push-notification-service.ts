import { db } from "../db";
import { pushNotificationDevices, pushNotificationPreferences } from "../../shared/schema.push-notifications";
import { users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { IStorage } from "../storage";

export class PushNotificationService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  // Register a device token for a user
  async registerDevice(userId: number, deviceToken: string, deviceType: 'ios' | 'android' = 'ios') {
    try {
      // Check if device token already exists
      const existingDevice = await db.select()
        .from(pushNotificationDevices)
        .where(eq(pushNotificationDevices.deviceToken, deviceToken))
        .limit(1);

      if (existingDevice.length > 0) {
        // Update the existing device if it belongs to this user
        if (existingDevice[0].userId === userId) {
          await db.update(pushNotificationDevices)
            .set({ lastUsed: new Date(), deviceType })
            .where(eq(pushNotificationDevices.deviceToken, deviceToken));
          return { success: true, message: 'Device token updated' };
        } else {
          // Token belongs to another user
          return { success: false, message: 'Device token already registered to another user' };
        }
      }

      // Create a new device token entry
      await db.insert(pushNotificationDevices)
        .values({
          userId,
          deviceToken,
          deviceType,
          lastUsed: new Date(),
        });

      // Initialize notification preferences if they don't exist
      await this.ensureUserPreferences(userId);

      return { success: true, message: 'Device token registered successfully' };
    } catch (error) {
      console.error('Error registering device token:', error);
      return { success: false, message: 'Failed to register device token' };
    }
  }

  // Make sure user has notification preferences set up
  async ensureUserPreferences(userId: number) {
    try {
      const existingPreferences = await db.select()
        .from(pushNotificationPreferences)
        .where(eq(pushNotificationPreferences.userId, userId))
        .limit(1);

      if (existingPreferences.length === 0) {
        // Create default preferences for this user
        await db.insert(pushNotificationPreferences)
          .values({
            userId,
            workoutReminders: false,
            mealReminders: false,
            planUpdates: true, // Enable by default
          });
      }

      return true;
    } catch (error) {
      console.error('Error ensuring user preferences:', error);
      return false;
    }
  }

  // Get user's notification preferences
  async getUserPreferences(userId: number) {
    try {
      await this.ensureUserPreferences(userId);

      const preferences = await db.select()
        .from(pushNotificationPreferences)
        .where(eq(pushNotificationPreferences.userId, userId))
        .limit(1);

      if (preferences.length === 0) {
        return {
          workoutReminders: false,
          mealReminders: false,
          planUpdates: true,
        };
      }

      return {
        workoutReminders: preferences[0].workoutReminders,
        mealReminders: preferences[0].mealReminders,
        planUpdates: preferences[0].planUpdates,
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return {
        workoutReminders: false,
        mealReminders: false,
        planUpdates: true,
      };
    }
  }

  // Update user's notification preferences for a specific topic
  async updateTopicSubscription(
    userId: number,
    topic: 'workoutReminders' | 'mealReminders' | 'planUpdates',
    enabled: boolean
  ) {
    try {
      await this.ensureUserPreferences(userId);

      // Map API topic names to database column names
      const topicColumnMapping = {
        workoutReminders: 'workout_reminders',
        mealReminders: 'meal_reminders',
        planUpdates: 'plan_updates',
      };

      const columnName = topicColumnMapping[topic];

      await db.update(pushNotificationPreferences)
        .set({ [topic]: enabled, updatedAt: new Date() })
        .where(eq(pushNotificationPreferences.userId, userId));

      return { success: true, message: `${topic} subscription updated` };
    } catch (error) {
      console.error(`Error updating ${topic} subscription:`, error);
      return { success: false, message: `Failed to update ${topic} subscription` };
    }
  }

  // Get device tokens for users who have subscribed to a specific topic
  async getDeviceTokensForTopic(
    topic: 'workoutReminders' | 'mealReminders' | 'planUpdates',
    specificUserId?: number
  ) {
    try {
      // Start with the conditions we always need
      const conditions = [eq(pushNotificationPreferences[topic], true)];
      
      // Add user-specific condition if needed
      if (specificUserId) {
        conditions.push(eq(pushNotificationDevices.userId, specificUserId));
      }
      
      // Execute the query with the proper conditions
      const devices = await db
        .select({
          deviceToken: pushNotificationDevices.deviceToken,
          deviceType: pushNotificationDevices.deviceType,
          userId: users.id,
          username: users.username,
        })
        .from(pushNotificationDevices)
        .innerJoin(
          pushNotificationPreferences, 
          eq(pushNotificationDevices.userId, pushNotificationPreferences.userId)
        )
        .innerJoin(
          users, 
          eq(pushNotificationDevices.userId, users.id)
        )
        .where(and(...conditions));

      return devices;
    } catch (error) {
      console.error(`Error getting devices for ${topic}:`, error);
      return [];
    }
  }

  // Send a notification for plan generation completion
  async sendPlanGenerationNotification(userId: number, planId: number) {
    try {
      const devices = await this.getDeviceTokensForTopic('planUpdates', userId);
      
      if (devices.length === 0) {
        return { success: false, message: 'No devices found for this user' };
      }

      // In a real implementation, you would send the actual push notification here
      // using a service like Firebase Cloud Messaging, Apple Push Notification Service, etc.
      console.log(`Sending plan generation notification to user ${userId} for plan ${planId}`);
      console.log(`Devices: ${JSON.stringify(devices)}`);

      // For demonstration purposes, we're just logging the notification
      return { 
        success: true, 
        message: `Notification sent to ${devices.length} devices`,
        devices: devices
      };
    } catch (error) {
      console.error('Error sending plan generation notification:', error);
      return { success: false, message: 'Failed to send notification' };
    }
  }

  // Send a workout reminder notification
  async sendWorkoutReminderNotification(userId: number, workoutId: number, workoutName: string) {
    try {
      const devices = await this.getDeviceTokensForTopic('workoutReminders', userId);
      
      if (devices.length === 0) {
        return { success: false, message: 'No devices found for this user' };
      }

      // In a real implementation, you would send the push notification here
      console.log(`Sending workout reminder to user ${userId} for workout ${workoutId}`);
      console.log(`Devices: ${JSON.stringify(devices)}`);

      return { 
        success: true, 
        message: `Workout reminder sent to ${devices.length} devices`,
        devices: devices 
      };
    } catch (error) {
      console.error('Error sending workout reminder:', error);
      return { success: false, message: 'Failed to send workout reminder' };
    }
  }

  // Send a meal reminder notification
  async sendMealReminderNotification(userId: number, mealName: string, mealTime: string) {
    try {
      const devices = await this.getDeviceTokensForTopic('mealReminders', userId);
      
      if (devices.length === 0) {
        return { success: false, message: 'No devices found for this user' };
      }

      // In a real implementation, you would send the push notification here
      console.log(`Sending meal reminder to user ${userId} for meal ${mealName} at ${mealTime}`);
      console.log(`Devices: ${JSON.stringify(devices)}`);

      return { 
        success: true, 
        message: `Meal reminder sent to ${devices.length} devices`,
        devices: devices 
      };
    } catch (error) {
      console.error('Error sending meal reminder:', error);
      return { success: false, message: 'Failed to send meal reminder' };
    }
  }
}