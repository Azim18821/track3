-- Create meal_entries table to represent a meal occurrence
CREATE TABLE IF NOT EXISTS meal_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL, -- breakfast, lunch, dinner, snack
  date TIMESTAMP NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL, -- Custom name for the meal (e.g., "Post Workout Dinner")
  notes TEXT, -- Optional notes about the meal
  is_planned BOOLEAN NOT NULL DEFAULT FALSE -- True if automatically generated from plan
);

-- Create meal_items table to store individual food items in a meal
CREATE TABLE IF NOT EXISTS meal_items (
  id SERIAL PRIMARY KEY,
  meal_entry_id INTEGER NOT NULL REFERENCES meal_entries(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  serving_size REAL NOT NULL,
  serving_unit TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein REAL NOT NULL,
  carbs REAL NOT NULL,
  fat REAL NOT NULL,
  source_food_id INTEGER, -- Optional reference to a food database item or saved meal
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_meal_entries_user_id ON meal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_entries_date ON meal_entries(date);
CREATE INDEX IF NOT EXISTS idx_meal_items_meal_entry_id ON meal_items(meal_entry_id);