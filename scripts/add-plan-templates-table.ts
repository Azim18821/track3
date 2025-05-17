/**
 * Script to add plan templates table to the database
 * This migration creates a new table for storing reusable fitness and nutrition plan templates
 */

import { db } from '../server/db';
import { planTemplates } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function addPlanTemplatesTable() {
  console.log('Adding plan_templates table to the database...');
  
  try {
    // Create the plan_templates table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "plan_templates" (
        "id" SERIAL PRIMARY KEY,
        "trainer_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "type" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "workout_plan" JSONB,
        "meal_plan" JSONB,
        "target_fitness_level" TEXT,
        "target_body_type" TEXT,
        "tags" TEXT[] DEFAULT '{}',
        "duration" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "notes" TEXT,
        "is_archived" BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
    
    console.log('Successfully created plan_templates table!');
    return true;
  } catch (error) {
    console.error('Error creating plan_templates table:', error);
    return false;
  }
}

async function run() {
  const success = await addPlanTemplatesTable();
  
  if (success) {
    console.log('Migration completed successfully.');
  } else {
    console.error('Migration failed.');
    process.exit(1);
  }
  
  process.exit(0);
}

run();