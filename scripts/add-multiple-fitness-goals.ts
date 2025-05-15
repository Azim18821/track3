/**
 * Script to add support for multiple fitness goals
 * This migration adds a new fitness_goals text array column to the users table
 */

import { db, pool } from "../server/db";
import fs from 'fs';
import path from 'path';

async function addMultipleFitnessGoalsToUsers() {
  console.log("Checking if fitness_goals column exists in users table...");
  
  try {
    // Check if fitness_goals column exists
    const fitnessGoalsColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'fitness_goals'
    `);
    
    if (fitnessGoalsColumn.rows.length === 0) {
      console.log("fitness_goals column does not exist. Running migration...");
      
      // Load and run the SQL migration
      const migrationPath = path.join(__dirname, '../migrations/add-multiple-fitness-goals.sql');
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      
      await pool.query(migrationSql);
      
      // Populate the new array column with existing single goals for backward compatibility
      // This ensures users with a single goal will have it converted to the array format
      await pool.query(`
        UPDATE users
        SET fitness_goals = ARRAY[fitness_goal]
        WHERE fitness_goal IS NOT NULL AND fitness_goals IS NULL;
      `);
      
      console.log("Multiple fitness goals migration completed successfully");
    } else {
      console.log("fitness_goals column already exists. Skipping migration.");
    }

    // Close connection pool
    await pool.end();
    
  } catch (error) {
    console.error("Error running multiple fitness goals migration:", error);
    process.exit(1);
  }
}

// Run the migration
addMultipleFitnessGoalsToUsers()
  .then(() => {
    console.log("Multiple fitness goals migration script completed.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Migration script error:", error);
    process.exit(1);
  });