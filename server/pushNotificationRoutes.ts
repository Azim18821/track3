import { Router } from "express";
import { z } from "zod";
import { ensureAuthenticated } from "./auth";
import { PushNotificationService } from "./services/push-notification-service";
import { storage } from "./storage";

const router = Router();
const pushNotificationService = new PushNotificationService(storage);

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// Create the registration schema
const deviceRegistrationSchema = z.object({
  token: z.string().min(1),
  deviceType: z.enum(["ios", "android"]).default("ios"),
});

// Register a device token
router.post("/register-device", async (req, res) => {
  try {
    const validation = deviceRegistrationSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        message: "Invalid request data", 
        errors: validation.error.errors 
      });
    }

    const { token, deviceType } = validation.data;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const result = await pushNotificationService.registerDevice(
      userId, 
      token,
      deviceType as 'ios' | 'android'
    );

    if (result.success) {
      return res.status(200).json({ message: result.message });
    } else {
      return res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error("Error registering device:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get notification settings for the current user
router.get("/settings", async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const preferences = await pushNotificationService.getUserPreferences(userId);
    return res.status(200).json(preferences);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Subscribe to a specific topic
router.post("/subscribe/:topic", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { topic } = req.params;

    // Validate the topic
    if (!["workout_reminders", "meal_reminders", "plan_updates"].includes(topic)) {
      return res.status(400).json({ message: "Invalid topic" });
    }

    // Map API topic names to database column names
    const topicMapping: Record<string, any> = {
      workout_reminders: "workoutReminders",
      meal_reminders: "mealReminders",
      plan_updates: "planUpdates",
    };

    const dbTopic = topicMapping[topic];
    const result = await pushNotificationService.updateTopicSubscription(
      userId,
      dbTopic,
      true
    );

    if (result.success) {
      return res.status(200).json({ message: result.message });
    } else {
      return res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error("Error subscribing to topic:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Unsubscribe from a specific topic
router.post("/unsubscribe/:topic", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { topic } = req.params;

    // Validate the topic
    if (!["workout_reminders", "meal_reminders", "plan_updates"].includes(topic)) {
      return res.status(400).json({ message: "Invalid topic" });
    }

    // Map API topic names to database column names
    const topicMapping: Record<string, any> = {
      workout_reminders: "workoutReminders",
      meal_reminders: "mealReminders",
      plan_updates: "planUpdates",
    };

    const dbTopic = topicMapping[topic];
    const result = await pushNotificationService.updateTopicSubscription(
      userId,
      dbTopic,
      false
    );

    if (result.success) {
      return res.status(200).json({ message: result.message });
    } else {
      return res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error("Error unsubscribing from topic:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// For testing: send a test notification
router.post("/test-notification/:type", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { type } = req.params;
    let result;

    switch (type) {
      case "plan":
        result = await pushNotificationService.sendPlanGenerationNotification(userId, 1);
        break;
      case "workout":
        result = await pushNotificationService.sendWorkoutReminderNotification(userId, 1, "Test Workout");
        break;
      case "meal":
        result = await pushNotificationService.sendMealReminderNotification(userId, "Lunch", "12:30 PM");
        break;
      default:
        return res.status(400).json({ message: "Invalid notification type" });
    }

    if (result.success) {
      return res.status(200).json({ 
        message: result.message,
        devices: result.devices
      });
    } else {
      return res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error("Error sending test notification:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;