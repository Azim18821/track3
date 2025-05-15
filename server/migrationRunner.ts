import { db, pool } from "./db";
import fs from 'fs';
import path from 'path';

/**
 * This script checks and adds any potentially missing columns in the database schema
 * It will run on every startup but only apply changes if needed
 */
export async function runExerciseSetsTableMigration(): Promise<void> {
  console.log("Checking if exercise_sets table exists...");
  
  try {
    // Check if exercise_sets table exists
    const exerciseSetsTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'exercise_sets'
    `);
    
    if (exerciseSetsTable.rows.length === 0) {
      console.log("exercise_sets table does not exist. Creating it...");
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS exercise_sets (
          id SERIAL PRIMARY KEY,
          exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
          set_number INTEGER NOT NULL,
          reps INTEGER,
          weight REAL,
          completed BOOLEAN DEFAULT FALSE,
          set_type TEXT,
          target_rpe REAL,
          tempo TEXT,
          distance REAL,
          duration REAL,
          rest_after REAL,
          notes TEXT,
          
          -- Ensure unique combination of exercise_id and set_number
          UNIQUE(exercise_id, set_number)
        );
        
        -- Create index for faster lookups
        CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise_id ON exercise_sets(exercise_id);
      `);
      
      console.log("exercise_sets table created successfully");
    } else {
      console.log("exercise_sets table already exists.");
    }
  } catch (error) {
    console.error("Error creating exercise_sets table:", error);
    throw error;
  }
}

/**
 * Migration to add multiple fitness goals support
 * Adds a new fitness_goals column as text array to users table
 */
export async function runMultipleFitnessGoalsMigration(): Promise<void> {
  console.log("Checking if fitness_goals column exists in users table...");
  
  try {
    // Check if fitness_goals column exists
    const fitnessGoalsColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'fitness_goals'
    `);
    
    if (fitnessGoalsColumn.rows.length === 0) {
      console.log("fitness_goals column does not exist. Adding it...");
      
      // Add the column directly
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS fitness_goals TEXT[];
        
        -- Update existing users to convert their single fitness goal to the new array format
        UPDATE users
        SET fitness_goals = ARRAY[fitness_goal]
        WHERE fitness_goal IS NOT NULL AND fitness_goals IS NULL;
      `);
      
      console.log("Multiple fitness goals migration completed successfully");
    } else {
      console.log("fitness_goals column already exists. Skipping migration.");
    }
  } catch (error) {
    console.error("Error running multiple fitness goals migration:", error);
    throw error;
  }
}

export async function runProfileColumnsMigration(): Promise<void> {
  console.log("Checking if database schema update is needed...");
  
  try {
    // ---- Check user profile columns ----
    const userProfileColumnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'date_of_birth'
    `);
    
    if (userProfileColumnsResult.rows.length === 0) {
      console.log("User profile columns do not exist. Running migration...");
      
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS date_of_birth TIMESTAMP,
        ADD COLUMN IF NOT EXISTS gender TEXT,
        ADD COLUMN IF NOT EXISTS height REAL,
        ADD COLUMN IF NOT EXISTS weight REAL,
        ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'kg',
        ADD COLUMN IF NOT EXISTS height_unit TEXT DEFAULT 'cm'
      `);
      
      console.log("User profile columns added successfully");
    } else {
      console.log("User profile columns already exist.");
    }
    
    // Check fitnessGoal column
    const fitnessGoalColumnResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'fitness_goal'
    `);
    
    if (fitnessGoalColumnResult.rows.length === 0) {
      console.log("User 'fitness_goal' column does not exist. Adding it...");
      
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS fitness_goal TEXT
      `);
      
      console.log("User 'fitness_goal' column added successfully");
    }
    
    // Check bodyType column
    const bodyTypeColumnResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'body_type'
    `);
    
    if (bodyTypeColumnResult.rows.length === 0) {
      console.log("User 'body_type' column does not exist. Adding it...");
      
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS body_type TEXT
      `);
      
      console.log("User 'body_type' column added successfully");
    }
    
    // Check age column
    const ageColumnResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'age'
    `);
    
    if (ageColumnResult.rows.length === 0) {
      console.log("User 'age' column does not exist. Adding it...");
      
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS age INTEGER
      `);
      
      console.log("User 'age' column added successfully");
    }
    
    // Check all additional user profile columns that might be needed for onboarding
    // Additional fitness profile data columns
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS activity_level TEXT,
      ADD COLUMN IF NOT EXISTS workout_days_per_week INTEGER,
      ADD COLUMN IF NOT EXISTS workout_duration INTEGER,
      ADD COLUMN IF NOT EXISTS fitness_level TEXT,
      ADD COLUMN IF NOT EXISTS target_weight REAL,
      ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT,
      ADD COLUMN IF NOT EXISTS weekly_budget REAL,
      ADD COLUMN IF NOT EXISTS ai_analysis TEXT
    `);
    console.log("Ensured all additional user profile columns exist");
    
    // Check hasCompletedOnboarding column
    const hasCompletedOnboardingResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'has_completed_onboarding'
    `);
    
    if (hasCompletedOnboardingResult.rows.length === 0) {
      console.log("User 'has_completed_onboarding' column does not exist. Adding it...");
      
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false
      `);
      
      console.log("User 'has_completed_onboarding' column added successfully");
    }
    
    // Check hasAcknowledgedAnalysis column
    const hasAcknowledgedAnalysisResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'has_acknowledged_analysis'
    `);
    
    if (hasAcknowledgedAnalysisResult.rows.length === 0) {
      console.log("User 'has_acknowledged_analysis' column does not exist. Adding it...");
      
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS has_acknowledged_analysis BOOLEAN DEFAULT false
      `);
      
      console.log("User 'has_acknowledged_analysis' column added successfully");
    }

    // ---- Check meals table columns ----
    // First check if is_planned column exists in the meals table
    const mealsPlannedColumnResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'meals' AND column_name = 'is_planned'
    `);
    
    if (mealsPlannedColumnResult.rows.length === 0) {
      console.log("Meals 'is_planned' column does not exist. Adding it...");
      
      await pool.query(`
        ALTER TABLE meals 
        ADD COLUMN IF NOT EXISTS is_planned BOOLEAN DEFAULT false
      `);
      
      console.log("Meals 'is_planned' column added successfully");
    }

    // ---- Check workouts table columns ----
    const workoutsPlannedColumnResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'workouts' AND column_name = 'is_planned'
    `);
    
    if (workoutsPlannedColumnResult.rows.length === 0) {
      console.log("Workouts 'is_planned' column does not exist. Adding it...");
      
      await pool.query(`
        ALTER TABLE workouts 
        ADD COLUMN IF NOT EXISTS is_planned BOOLEAN DEFAULT false
      `);
      
      console.log("Workouts 'is_planned' column added successfully");
    }

    // ---- Check fitness_plans table columns ----
    const fitnessPlanDeactivatedReason = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'fitness_plans' AND column_name = 'deactivation_reason'
    `);
    
    if (fitnessPlanDeactivatedReason.rows.length === 0) {
      console.log("Fitness plans 'deactivation_reason' column does not exist. Adding it...");
      
      await pool.query(`
        ALTER TABLE fitness_plans 
        ADD COLUMN IF NOT EXISTS deactivation_reason TEXT,
        ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP
      `);
      
      console.log("Fitness plans columns added successfully");
    }
    
    // ---- Check if plan_generation_status table exists ----
    const planGenerationStatusTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'plan_generation_status'
    `);
    
    if (planGenerationStatusTable.rows.length === 0) {
      console.log("plan_generation_status table does not exist. Creating it...");
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS plan_generation_status (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          is_generating BOOLEAN NOT NULL DEFAULT false,
          started_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          current_step INTEGER DEFAULT 0,
          total_steps INTEGER DEFAULT 5,
          step_message TEXT,
          estimated_time_remaining INTEGER,
          error_message TEXT,
          retry_count INTEGER DEFAULT 0
        )
      `);
      
      console.log("plan_generation_status table created successfully");
    } else {
      // Check if progress tracking columns exist
      const progressColumns = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'plan_generation_status' AND column_name = 'current_step'
      `);
      
      if (progressColumns.rows.length === 0) {
        console.log("Adding progress tracking columns to plan_generation_status table...");
        
        await pool.query(`
          ALTER TABLE plan_generation_status 
          ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS total_steps INTEGER DEFAULT 5,
          ADD COLUMN IF NOT EXISTS step_message TEXT,
          ADD COLUMN IF NOT EXISTS estimated_time_remaining INTEGER,
          ADD COLUMN IF NOT EXISTS error_message TEXT,
          ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0
        `);
        
        console.log("Progress tracking columns added successfully to plan_generation_status table");
      }
    }
    
    console.log("Database schema update completed");
    
  } catch (error) {
    console.error("Error during database schema update:", error);
    throw error;
  }
}