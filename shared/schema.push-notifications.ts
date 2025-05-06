import { pgTable, serial, integer, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema";

// Table for storing device push notification tokens
export const pushNotificationDevices = pgTable("push_notification_devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceToken: text("device_token").notNull(),
  deviceType: text("device_type").notNull().default('ios'), // 'ios' or 'android'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsed: timestamp("last_used").notNull().defaultNow(),
}, (table) => {
  return {
    uniqDeviceToken: unique('uniq_device_token').on(table.deviceToken),
  }
});

// Table for storing user notification preferences
export const pushNotificationPreferences = pgTable("push_notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  workoutReminders: boolean("workout_reminders").default(false).notNull(),
  mealReminders: boolean("meal_reminders").default(false).notNull(),
  planUpdates: boolean("plan_updates").default(true).notNull(), // Enabled by default
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    uniqUser: unique('uniq_push_notification_user').on(table.userId),
  }
});

// Relations for push notification devices
export const pushNotificationDevicesRelations = relations(pushNotificationDevices, ({ one }) => ({
  user: one(users, {
    fields: [pushNotificationDevices.userId],
    references: [users.id],
  }),
}));

// Relations for push notification preferences
export const pushNotificationPreferencesRelations = relations(pushNotificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [pushNotificationPreferences.userId],
    references: [users.id],
  }),
}));

// Create schemas for insert operations
export const insertPushNotificationDeviceSchema = createInsertSchema(pushNotificationDevices).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
});

export const insertPushNotificationPreferenceSchema = createInsertSchema(pushNotificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Topic types for subscriptions
export const notificationTopics = ['workout_reminders', 'meal_reminders', 'plan_updates'] as const;
export type NotificationTopic = typeof notificationTopics[number];

// Type definitions
export type PushNotificationDevice = typeof pushNotificationDevices.$inferSelect;
export type InsertPushNotificationDevice = z.infer<typeof insertPushNotificationDeviceSchema>;

export type PushNotificationPreference = typeof pushNotificationPreferences.$inferSelect;
export type InsertPushNotificationPreference = z.infer<typeof insertPushNotificationPreferenceSchema>;