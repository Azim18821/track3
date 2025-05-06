-- Push Notification Migration

-- Create push_notification_devices table
CREATE TABLE IF NOT EXISTS push_notification_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'ios',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uniq_device_token UNIQUE(device_token)
);

-- Create push_notification_preferences table
CREATE TABLE IF NOT EXISTS push_notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_reminders BOOLEAN NOT NULL DEFAULT FALSE,
  meal_reminders BOOLEAN NOT NULL DEFAULT FALSE,
  plan_updates BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uniq_push_notification_user UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_notification_devices_user_id ON push_notification_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_preferences_user_id ON push_notification_preferences(user_id);

-- Add comment for documentation
COMMENT ON TABLE push_notification_devices IS 'Stores device tokens for push notifications';
COMMENT ON TABLE push_notification_preferences IS 'Stores user preferences for different types of push notifications';