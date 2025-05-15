-- Migration to add support for multiple fitness goals
-- This adds a new column 'fitness_goals' as an array type to the users table

ALTER TABLE users
ADD COLUMN IF NOT EXISTS fitness_goals TEXT[];

-- Comment for the new column
COMMENT ON COLUMN users.fitness_goals IS 'Array of fitness goals for supporting multiple goals selection';

-- Update existing users to convert their single fitness goal to the new array format
-- This ensures backward compatibility
UPDATE users
SET fitness_goals = ARRAY[fitness_goal]
WHERE fitness_goal IS NOT NULL AND fitness_goals IS NULL;