-- Add fitnessGoal column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fitness_goal" TEXT;