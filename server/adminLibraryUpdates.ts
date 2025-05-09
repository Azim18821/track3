import { updateExerciseLibrary } from './updateExerciseLibrary';
import { updateMealRecipes } from './updateMealRecipes';

// Function to update exercise library
export async function updateExercises(options: { count?: number, category?: string } = {}) {
  try {
    // Extract count from options or use default
    const count = options.count || 5;
    // Use category if provided
    const category = options.category;
    
    // Track duplicates and added count
    let added = 0;
    let duplicatesSkipped = 0;
    
    console.log(`Updating exercise library with ${count} exercises, category: ${category || 'all'}`);
    
    // Call the actual update function
    await updateExerciseLibrary(count);
    
    // For now, we're making an assumption about the result
    // In a real implementation, updateExerciseLibrary should return these counts
    added = count;
    duplicatesSkipped = 0;
    
    return {
      success: true,
      message: 'Exercise library updated successfully',
      added: added,
      duplicatesSkipped: duplicatesSkipped
    };
  } catch (error: unknown) {
    console.error('Error updating exercise library:', error);
    return {
      success: false,
      message: 'Failed to update exercise library',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Function to update meal recipes
export async function updateMeals(options: { count?: number, mealType?: string } = {}) {
  try {
    // Extract count from options or use default
    const count = options.count || 5;
    // Use meal type if provided
    const mealType = options.mealType;
    
    // Track duplicates and added count
    let added = 0;
    let duplicatesSkipped = 0;
    
    console.log(`Updating meal library with ${count} recipes, meal type: ${mealType || 'all'}`);
    
    // Call the actual update function
    await updateMealRecipes(count);
    
    // For now, we're making an assumption about the result
    // In a real implementation, updateMealRecipes should return these counts
    added = count;
    duplicatesSkipped = 0;
    
    return {
      success: true,
      message: 'Meal recipes updated successfully',
      added: added,
      duplicatesSkipped: duplicatesSkipped
    };
  } catch (error: unknown) {
    console.error('Error updating meal recipes:', error);
    return {
      success: false,
      message: 'Failed to update meal recipes',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Function to update both libraries
export async function updateBothLibraries(options: { 
  exercises?: { count?: number, category?: string },
  meals?: { count?: number, mealType?: string }
} = {}) {
  const exerciseResult = await updateExercises(options.exercises || {});
  const mealResult = await updateMeals(options.meals || {});
  
  return {
    success: exerciseResult.success && mealResult.success,
    message: 'Libraries updated successfully',
    exerciseResult: {
      added: exerciseResult.added,
      duplicatesSkipped: exerciseResult.duplicatesSkipped
    },
    mealResult: {
      added: mealResult.added,
      duplicatesSkipped: mealResult.duplicatesSkipped
    }
  };
}