import { updateExerciseLibrary } from './updateExerciseLibrary';
import { updateMealRecipes } from './updateMealRecipes';

// Function to update exercise library
export async function updateExercises(options: { count?: number, category?: string } = {}) {
  try {
    // Extract count from options or use default
    const count = options.count || 5;
    const result = await updateExerciseLibrary(count);
    return {
      success: true,
      message: 'Exercise library updated successfully',
      data: result
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
    const result = await updateMealRecipes(count);
    return {
      success: true,
      message: 'Meal recipes updated successfully',
      data: result
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
    exerciseUpdate: exerciseResult,
    mealUpdate: mealResult,
    success: exerciseResult.success && mealResult.success
  };
}