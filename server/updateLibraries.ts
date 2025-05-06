// Main script to update both exercise and meal recipe libraries
// This script can be scheduled to run periodically to keep content fresh

import { updateExerciseLibrary } from "./updateExerciseLibrary";
import { updateMealRecipes } from "./updateMealRecipes";
import { fileURLToPath } from 'url';
import path from 'path';

// For ES modules to determine if this file is being run directly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Updates both the exercise library and meal recipe library
 * @param exerciseCount Number of new exercises to generate
 * @param recipeCount Number of new recipes to generate
 */
async function updateLibraries(exerciseCount: number = 5, recipeCount: number = 5): Promise<void> {
  console.log("=== Starting library updates ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("============================");
  
  try {
    // Update exercise library
    console.log("\n[1/2] Updating Exercise Library");
    await updateExerciseLibrary(exerciseCount);
    
    console.log("\n[2/2] Updating Meal Recipe Library");
    await updateMealRecipes(recipeCount);
    
    console.log("\n=== Library updates completed successfully ===");
  } catch (error) {
    console.error("\n=== Error during library updates ===");
    console.error(error);
  }
}

// Only auto-execute in development when explicitly run as a script
// This prevents automatic execution during production deployment
if (process.argv[1] === __filename && process.env.NODE_ENV === 'development' && process.env.MANUALLY_RUN_UPDATES === 'true') {
  // If this script is run directly
  const exerciseArg = process.argv[2];
  const recipeArg = process.argv[3];
  
  const exerciseCount = exerciseArg ? parseInt(exerciseArg, 10) : 5;
  const recipeCount = recipeArg ? parseInt(recipeArg, 10) : 5;
  
  updateLibraries(exerciseCount, recipeCount)
    .then(() => {
      console.log("Libraries update process completed.");
      process.exit(0);
    })
    .catch(err => {
      console.error("Error during libraries update process:", err);
      process.exit(1);
    });
}

export default updateLibraries;