-- Add isPlanMode column to workouts table
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS is_plan_mode BOOLEAN DEFAULT FALSE;

-- Make reps nullable in the exercises table
ALTER TABLE exercises ALTER COLUMN reps DROP NOT NULL;

-- Update any existing exercises with null reps to default value of 10
UPDATE exercises SET reps = 10 WHERE reps IS NULL;