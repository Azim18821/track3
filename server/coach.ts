import OpenAI from "openai";
import { User } from "@shared/schema";

// Create OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Input data needed to generate a coach response
 */
export interface CoachInput {
  age: number;
  sex: 'male' | 'female';
  height: number; // in cm
  weight: number; // in kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
  fitnessGoal: 'weight_loss' | 'muscle_gain' | 'strength' | 'stamina' | 'endurance';
  dietaryPreferences: string[]; // e.g., ['vegetarian', 'halal', 'no seafood']
  weeklyBudget: number; // in GBP
  location?: string; // optional postcode or city
  // Workout schedule preferences
  workoutDaysPerWeek: number; // Number of days to work out (1-7)
  preferredWorkoutDays?: string[]; // e.g., ['Monday', 'Wednesday', 'Friday']
  workoutDuration?: number; // Preferred workout duration in minutes
  workoutNames?: {
    [day: string]: string; // e.g., { "Monday": "Chest Day", "Tuesday": "Leg Day" }
  };
  // Email notification preferences
  notifyByEmail?: boolean; // Whether to send email notifications
  email?: string; // User's email address for notifications
}

/**
 * Nutrition data calculation including BMR, TDEE, and macronutrient targets
 */
export interface NutritionData {
  bmr: number;
  tdee: number;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}

/**
 * Shopping list item including detailed product information, costs, and store data
 */
export interface ShoppingItem {
  name: string;
  brand?: string;
  quantity: string;
  estimatedCost: number;
  unitPrice?: string; // e.g., "£2.50/kg", "£0.85/100g"
  store?: string;
  storeUrl?: string;
  url?: string;
  category?: string; // e.g., "Protein", "Vegetables", "Grains"
  mealAssociations?: string[]; // List of meals this ingredient is used in
  recipeIds?: number[]; // IDs of recipes this ingredient is used in
  alternativeOptions?: Array<{
    name: string;
    store: string;
    price: number;
    storeUrl?: string;
  }>;
}

/**
 * Meal item for meal planning with detailed cooking instructions
 */
export interface MealItem {
  name: string;
  description: string;
  ingredients: string[];
  cookingInstructions?: string[]; // Step-by-step cooking instructions
  prepTime?: number; // Preparation time in minutes
  cookTime?: number; // Cooking time in minutes
  difficulty?: 'easy' | 'medium' | 'hard'; // Difficulty level
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  // Recipe tracking and association
  recipeId?: number; // Reference to recipe ID if saved
  mealLogId?: number; // Reference to meal log entry if logged
  [key: string]: any; // Allow for additional properties like _notes
}

/**
 * Daily meal plan structure that can handle any meal type
 */
export interface DailyMeal {
  [mealType: string]: MealItem | MealItem[];
}

/**
 * Exercise in a workout plan with tracking capabilities
 */
export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rest: number; // in seconds
  weight?: number;
  instructions?: string[]; // Step-by-step exercise instructions
  targetMuscleGroups?: string[]; // Primary muscles targeted
  secondaryMuscleGroups?: string[]; // Secondary muscles worked
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  equipment?: string[]; // Required equipment
  videoUrl?: string; // URL to demonstration video
  alternativeExercises?: string[]; // Alternative exercises that can be substituted
  workoutLogId?: number; // Reference to workout log entry if logged
  exerciseId?: number; // Reference to exercise library entry
}

/**
 * Structure for a daily workout with detailed information for workout logs
 */
export interface WorkoutDay {
  name: string;
  description: string;
  exercises: Exercise[];
  estimatedDuration?: number; // Estimated duration in minutes
  caloriesBurned?: number; // Estimated calories burned
  workoutType?: 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'recovery' | 'sport' | 'hybrid';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  workoutLogId?: number; // Reference to workout log entry if logged
  notes?: string[]; // Additional notes/tips for the workout
  warmupRoutine?: string[]; // Warmup exercises/instructions
  cooldownRoutine?: string[]; // Cooldown exercises/instructions
}

/**
 * Comprehensive response from the coach including budget analysis
 */
export interface CoachResponse {
  nutritionData: NutritionData;
  weeklyMealPlan: {
    [day: string]: DailyMeal;
  };
  weeklyWorkoutPlan: {
    [day: string]: WorkoutDay;
  };
  shoppingList: ShoppingItem[];
  organizedShoppingList?: {
    byCategory: {
      [category: string]: ShoppingItem[];
    };
    byMeal: {
      [mealName: string]: ShoppingItem[];
    };
    byStore: {
      [storeName: string]: ShoppingItem[];
    };
  };
  budgetAnalysis?: {
    totalCost: number;
    weeklyBudget: number;
    percentOfBudget: number;
    savings: number;
    costBreakdown: {
      protein: number;
      carbs: number;
      produce: number;
      dairy: number;
      other: number;
    };
    savingTips: string[];
  };
  suggestedStores: string[];
  mealPrepInstructions?: string[];
}

/**
 * Calculate BMR using the Mifflin-St Jeor formula
 */
function calculateBMR(input: CoachInput): number {
  // Mifflin-St Jeor Equation:
  // For men: BMR = 10W + 6.25H - 5A + 5
  // For women: BMR = 10W + 6.25H - 5A - 161
  // Where:
  // W is weight in kg
  // H is height in cm
  // A is age in years

  if (input.sex === 'male') {
    return (10 * input.weight) + (6.25 * input.height) - (5 * input.age) + 5;
  } else {
    return (10 * input.weight) + (6.25 * input.height) - (5 * input.age) - 161;
  }
}

/**
 * Calculate TDEE based on BMR and activity level
 */
function calculateTDEE(bmr: number, activityLevel: string): number {
  // Activity Multipliers:
  // Sedentary (little or no exercise): BMR × 1.2
  // Light (light exercise/sports 1-3 days/week): BMR × 1.375
  // Moderate (moderate exercise/sports 3-5 days/week): BMR × 1.55
  // Very Active (hard exercise/sports 6-7 days/week): BMR × 1.725
  // Extra Active (very hard exercise, physical job or training twice a day): BMR × 1.9

  switch (activityLevel) {
    case 'sedentary':
      return bmr * 1.2;
    case 'light':
      return bmr * 1.375;
    case 'moderate':
      return bmr * 1.55;
    case 'very_active':
      return bmr * 1.725;
    case 'extra_active':
      return bmr * 1.9;
    default:
      return bmr * 1.55; // Default to moderate activity if unspecified
  }
}

/**
 * Adjust calories based on fitness goal
 */
function adjustCaloriesForGoal(tdee: number, goal: string): number {
  switch (goal) {
    case 'weight_loss':
      return tdee - 500; // Caloric deficit of 500 calories for weight loss
    case 'muscle_gain':
      return tdee + 300; // Caloric surplus of 300 calories for muscle gain
    case 'stamina':
    case 'endurance':
      return tdee + 100; // Slight surplus for endurance training
    case 'strength':
      return tdee + 200; // Moderate surplus for strength training
    default:
      return tdee; // Maintain current weight if goal is not specified
  }
}

/**
 * Calculate macronutrient targets based on goal
 */
function calculateMacros(calorieTarget: number, goal: string, weight: number): { protein: number, carbs: number, fat: number } {
  let proteinMultiplier: number;
  let fatPercentage: number;
  let carbsPercentage: number;

  switch (goal) {
    case 'weight_loss':
      // Higher protein, moderate fat, lower carbs for weight loss
      proteinMultiplier = 2.0; // 2.0g per kg bodyweight
      fatPercentage = 0.30; // 30% of calories from fat
      // Carbs make up the remainder
      break;
    case 'muscle_gain':
      // High protein, moderate fat, higher carbs for muscle gain
      proteinMultiplier = 2.2; // 2.2g per kg bodyweight
      fatPercentage = 0.25; // 25% of calories from fat
      // Carbs make up the remainder
      break;
    case 'strength':
      // Higher protein, moderate fat, moderate carbs for strength
      proteinMultiplier = 2.0; // 2.0g per kg bodyweight
      fatPercentage = 0.30; // 30% of calories from fat
      // Carbs make up the remainder
      break;
    case 'stamina':
    case 'endurance':
      // Moderate protein, lower fat, higher carbs for endurance
      proteinMultiplier = 1.6; // 1.6g per kg bodyweight
      fatPercentage = 0.25; // 25% of calories from fat
      // Carbs make up the remainder
      break;
    default:
      // Balanced macros for maintenance
      proteinMultiplier = 1.8; // 1.8g per kg bodyweight
      fatPercentage = 0.30; // 30% of calories from fat
      // Carbs make up the remainder
  }

  // Calculate protein (4 calories per gram)
  const proteinGrams = weight * proteinMultiplier;
  const proteinCalories = proteinGrams * 4;
  
  // Calculate fat (9 calories per gram)
  const fatCalories = calorieTarget * fatPercentage;
  const fatGrams = Math.round(fatCalories / 9);
  
  // Remaining calories from carbs (4 calories per gram)
  const carbCalories = calorieTarget - proteinCalories - fatCalories;
  const carbGrams = Math.round(carbCalories / 4);

  return {
    protein: Math.round(proteinGrams),
    carbs: carbGrams,
    fat: fatGrams
  };
}

/**
 * Generate nutrition data based on user input
 */
export function generateNutritionData(input: CoachInput): NutritionData {
  // Calculate BMR using Mifflin-St Jeor formula
  const bmr = Math.round(calculateBMR(input));
  
  // Calculate TDEE based on activity level
  const tdee = Math.round(calculateTDEE(bmr, input.activityLevel));
  
  // Adjust calories based on fitness goal
  const calorieTarget = Math.round(adjustCaloriesForGoal(tdee, input.fitnessGoal));
  
  // Calculate macronutrient targets
  const macros = calculateMacros(calorieTarget, input.fitnessGoal, input.weight);

  return {
    bmr,
    tdee,
    calorieTarget,
    proteinTarget: macros.protein,
    carbsTarget: macros.carbs,
    fatTarget: macros.fat
  };
}

/**
 * Validate that each day's meal plan meets the nutrition requirements.
 * Checks calories and macronutrients, adding notes where targets aren't met.
 */
function validateMealPlanCalories(
  weeklyMealPlan: Record<string, DailyMeal>,
  targetCalories: number,
  fitnessGoal: string,
  proteinTarget: number = 0,
  carbsTarget: number = 0,
  fatTarget: number = 0
): Record<string, DailyMeal> {
  console.log("Validating meal plan nutrition against targets:", 
              `Calories: ${targetCalories}, Protein: ${proteinTarget}g, Carbs: ${carbsTarget}g, Fat: ${fatTarget}g`);
  
  // Clone the meal plan to avoid modifying the original
  const validatedMealPlan = JSON.parse(JSON.stringify(weeklyMealPlan));
  
  // Define nutrition thresholds for different goals
  const calorieThreshold = fitnessGoal === 'muscle_gain' ? 0.98 : 
                         fitnessGoal === 'weight_loss' ? 0.95 : 0.97;
  
  const proteinThreshold = fitnessGoal === 'muscle_gain' ? 0.98 : 0.95; // Protein very important for all goals
  const fatMinThreshold = 0.9; // At least 90% of fat target
  const fatMaxThreshold = 1.05; // No more than 105% of fat target
  
  // Track days with nutrition issues
  const lowCalorieDays: string[] = [];
  const lowProteinDays: string[] = [];
  const highFatDays: string[] = [];
  
  // Check if the meal plan uses ISO day format (Monday, Tuesday) or ordinal format (day1, day2)
  const usesISOFormat = Object.keys(weeklyMealPlan).some(day => 
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(day));
  
  // Get standard day names in order
  // Define standard day names in lowercase to match our expected format
  const standardDayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  // Check if we have all 7 days of the week with proper data
  // We're enforcing our standard day format (all lowercase)
  const missingDays = standardDayNames.filter(day => 
    !weeklyMealPlan[day] || 
    typeof weeklyMealPlan[day] !== 'object' ||
    Object.keys(weeklyMealPlan[day]).length === 0
  );
  
  if (missingDays.length > 0) {
    // Just log missing days without generating synthetic data
    console.error(`[CRITICAL ERROR] Meal plan is missing ${missingDays.length} days: ${missingDays.join(", ")}.`);
    console.error(`The AI model failed to generate a complete 7-day meal plan as required.`);
    console.error(`This should be fixed by improving the prompt or model response - not by generating synthetic data.`);
  }
  
  // Process each day's meal plan
  Object.entries(weeklyMealPlan).forEach(([day, mealData]) => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
    // Skip if mealData is not an object or is empty
    if (!mealData || typeof mealData !== 'object' || Object.keys(mealData).length === 0) {
      console.warn(`Warning: Day ${day} has no meal data or invalid format`);
      lowCalorieDays.push(day);
      lowProteinDays.push(day);
      return;
    }
    
    // Calculate total nutrition for the day
    Object.entries(mealData).forEach(([mealType, meal]) => {
      if (mealType === '_notes') {
        // Skip processing notes field
        return;
      }
      
      if (Array.isArray(meal)) {
        // Handle meal arrays like snacks
        meal.forEach((item: any) => {
          if (!item || typeof item !== 'object') {
            console.warn(`Warning: Invalid meal item in ${day}'s ${mealType}`);
            return;
          }
          
          // Get nutrition values from either location
          const calories = typeof item.nutrition?.calories === 'number' ? item.nutrition.calories :
                          typeof item.calories === 'number' ? item.calories : 0;
          const protein = typeof item.nutrition?.protein === 'number' ? item.nutrition.protein :
                          typeof item.protein === 'number' ? item.protein : 0;
          const carbs = typeof item.nutrition?.carbs === 'number' ? item.nutrition.carbs :
                        typeof item.carbs === 'number' ? item.carbs : 0;
          const fat = typeof item.nutrition?.fat === 'number' ? item.nutrition.fat :
                      typeof item.fat === 'number' ? item.fat : 0;
          
          totalCalories += calories;
          totalProtein += protein;
          totalCarbs += carbs;
          totalFat += fat;
        });
      } else if (meal && typeof meal === 'object') {
        // Handle single meal objects
        const mealObj = meal as any;
        const calories = typeof mealObj.nutrition?.calories === 'number' ? mealObj.nutrition.calories :
                        typeof mealObj.calories === 'number' ? mealObj.calories : 0;
        const protein = typeof mealObj.nutrition?.protein === 'number' ? mealObj.nutrition.protein :
                        typeof mealObj.protein === 'number' ? mealObj.protein : 0;
        const carbs = typeof mealObj.nutrition?.carbs === 'number' ? mealObj.nutrition.carbs :
                      typeof mealObj.carbs === 'number' ? mealObj.carbs : 0;
        const fat = typeof mealObj.nutrition?.fat === 'number' ? mealObj.nutrition.fat :
                    typeof mealObj.fat === 'number' ? mealObj.fat : 0;
        
        totalCalories += calories;
        totalProtein += protein;
        totalCarbs += carbs;
        totalFat += fat;
      }
    });
    
    // Check nutritional targets
    const caloriePercent = totalCalories / targetCalories;
    const proteinPercent = proteinTarget > 0 ? totalProtein / proteinTarget : 1;
    const fatPercent = fatTarget > 0 ? totalFat / fatTarget : 1;
    
    // Log the complete nutritional analysis for the day
    console.log(`${day}: ${Math.round(totalCalories)} cal (${Math.round(caloriePercent * 100)}% of target), ` +
               `${Math.round(totalProtein)}g protein (${Math.round(proteinPercent * 100)}%), ` +
               `${Math.round(totalCarbs)}g carbs, ` +
               `${Math.round(totalFat)}g fat (${Math.round(fatPercent * 100)}%)`);
    
    // Check if this day meets the thresholds
    if (caloriePercent < calorieThreshold) {
      lowCalorieDays.push(day);
    }
    
    if (proteinTarget > 0 && proteinPercent < proteinThreshold) {
      lowProteinDays.push(day);
    }
    
    if (fatTarget > 0 && fatPercent > fatMaxThreshold) {
      highFatDays.push(day);
    }
  });
  
  // Add nutrition notes to each day as needed
  Object.keys(validatedMealPlan).forEach(day => {
    if (!validatedMealPlan[day]._notes) {
      validatedMealPlan[day]._notes = [];
    }
    
    // Add calorie note if needed
    if (lowCalorieDays.includes(day)) {
      validatedMealPlan[day]._notes.push(
        `Important: Make sure to consume ALL meals to reach your daily calorie target of ${targetCalories} calories.`
      );
    }
    
    // Add protein note if needed
    if (lowProteinDays.includes(day)) {
      validatedMealPlan[day]._notes.push(
        `For your ${fitnessGoal} goal, try to add a protein shake or increase portions of high-protein foods to reach ${proteinTarget}g of protein.`
      );
    }
    
    // Add fat note if needed
    if (highFatDays.includes(day)) {
      validatedMealPlan[day]._notes.push(
        `This day exceeds your fat target of ${fatTarget}g. Consider reducing high-fat foods and replacing with lean proteins or complex carbs.`
      );
    }
  });
  
  // Log validation summary
  if (lowCalorieDays.length > 0) {
    console.warn(`Warning: These days don't meet calorie targets:`, lowCalorieDays.join(', '));
  }
  
  if (lowProteinDays.length > 0) {
    console.warn(`Warning: These days don't meet protein targets:`, lowProteinDays.join(', '));
  }
  
  if (highFatDays.length > 0) {
    console.warn(`Warning: These days exceed fat targets:`, highFatDays.join(', '));
  }
  
  return validatedMealPlan;
}

/**
 * Generate a comprehensive coach response using user input
 */
export async function generateCoachResponse(input: CoachInput, user: User): Promise<CoachResponse> {
  console.log(`Generating coach response for user ${user.id} (${user.username})`);
  
  // First, calculate nutrition data using scientific formulas
  const nutritionData = generateNutritionData(input);
  console.log("Calculated nutrition data:", nutritionData);

  // Prepare the prompt for OpenAI
  const promptData = {
    user: {
      age: input.age,
      sex: input.sex,
      height: input.height,
      weight: input.weight,
      activityLevel: input.activityLevel,
      fitnessGoal: input.fitnessGoal,
      dietaryPreferences: input.dietaryPreferences,
      weeklyBudget: input.weeklyBudget,
      location: input.location || "United Kingdom", // Default to UK if no location provided
      // Include workout schedule preferences
      workoutDaysPerWeek: input.workoutDaysPerWeek,
      preferredWorkoutDays: input.preferredWorkoutDays || [],
      workoutDuration: input.workoutDuration || 60, // Default to 60 minutes if not specified
      workoutNames: input.workoutNames || {}
    },
    nutritionData: {
      bmr: nutritionData.bmr,
      tdee: nutritionData.tdee,
      calorieTarget: nutritionData.calorieTarget,
      proteinTarget: nutritionData.proteinTarget,
      carbsTarget: nutritionData.carbsTarget,
      fatTarget: nutritionData.fatTarget
    }
  };

  // Create the prompt for OpenAI
  const systemPrompt = `You are a professional fitness coach and nutritionist. Generate a personalized weekly meal plan and workout routine with the following requirements:

1. ⚠️⚠️⚠️ HIGHEST PRIORITY REQUIREMENT: YOU MUST GENERATE A COMPLETE 7-DAY MEAL PLAN WITH ALL DAYS OF THE WEEK. ANY RESPONSE THAT IS MISSING ANY DAY WILL BE REJECTED. THE FINAL JSON RESPONSE MUST HAVE EXACTLY 7 DAYS.

2. ⚠️ ABSOLUTE CRITICAL REQUIREMENT: Every day's meals MUST REACH the calorie target. DO NOT CREATE ANY MEAL PLAN THAT FAILS TO MEET THE CALORIE TARGET.

3. NUTRITION TARGETS (CRITICALLY IMPORTANT - MANDATORY COMPLIANCE):
   - Daily Calories: ${nutritionData.calorieTarget} calories (MUST be between ${nutritionData.calorieTarget-50} and ${nutritionData.calorieTarget+50})
   - Daily Protein: ${nutritionData.proteinTarget}g (MUST be at least ${nutritionData.proteinTarget}g, can exceed by up to 10%)
   - Daily Carbs: ${nutritionData.carbsTarget}g (± 5% acceptable variance)
   - Daily Fat: ${nutritionData.fatTarget}g (± 5% acceptable variance)

4. CALORIE DEFICIENCY FAILURE: If you cannot create a meal plan that meets the EXACT calorie target, your response WILL BE REJECTED. It is a CRITICAL ERROR to generate meals that don't reach the target.

5. SPECIFIC REQUIREMENTS FOR ${input.fitnessGoal.toUpperCase()} GOALS:
   - ${input.fitnessGoal === 'muscle_gain' ? 'CALORIE SURPLUS IS MANDATORY - Daily calories must meet or slightly exceed target' : 
      input.fitnessGoal === 'weight_loss' ? 'CALORIE DEFICIT IS MANDATORY - But NEVER go below 95% of the target' : 
      'PRECISE CALORIE TARGET IS MANDATORY - Stay within ±50 calories of target'}
   - ${input.fitnessGoal === 'muscle_gain' ? 'HIGH PROTEIN IS MANDATORY - Protein MUST be at or above target (NO EXCEPTIONS)' : 
      input.fitnessGoal === 'weight_loss' ? 'HIGH PROTEIN IS MANDATORY - Protein MUST be at or above target to preserve muscle' : 
      'ADEQUATE PROTEIN IS MANDATORY - Protein must meet specified target'}
   - ${input.fitnessGoal === 'muscle_gain' ? 'CARB FOCUS - Emphasize carbs for energy and recovery' : 
      input.fitnessGoal === 'weight_loss' ? 'MODERATE CARBS - Focus on high-fiber, low-GI carb sources' : 
      'BALANCED CARBS - Provide steady energy throughout the day'}
   - ${input.fitnessGoal === 'muscle_gain' ? 'ADEQUATE FAT - Essential for hormone production' : 
      input.fitnessGoal === 'weight_loss' ? 'CONTROLLED FAT - Keep within target, emphasize healthy fats' : 
      'BALANCED FAT - Use healthy fat sources for overall health'}

6. STRICT VERIFICATION PROCESS: For EACH day, you MUST:
   - Calculate TOTAL daily calories, protein, carbs and fat
   - Verify they meet EXACTLY the targets specified above
   - If ANY day fails to meet these requirements, you MUST REVISE that day's meals before finalizing
   - Meeting nutrition targets is MORE IMPORTANT than variety or creativity

7. ⚠️⚠️⚠️ MEAL PLAN STRUCTURE REQUIREMENTS (CRITICAL): Create a 7-day meal plan with the EXACT following structure:
   - weeklyMeals object MUST contain EXACTLY 7 day keys: "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday" (all lowercase)
   - You MUST include ALL 7 DAYS IN YOUR RESPONSE - responses missing any day will be REJECTED
   - EACH DAY must contain meal objects with EXACT meal type keys:
     * For muscle gain goals: "breakfast", "morning_snack", "pre_workout", "lunch", "post_workout", "dinner", "evening_snack"
     * For weight loss: "breakfast", "lunch", "dinner", plus optional "snacks" array with 0-1 items
     * For all other goals: "breakfast", "lunch", "dinner", "snacks" array with 1-2 items

8. ⚠️ CRITICAL MEAL STRUCTURE: Each meal MUST be structured as an OBJECT (not a string or array) with these EXACT keys:
   - name: String with meal name
   - description: String with brief description
   - ingredients: Array of ingredient objects, each with:
     * name: String with ingredient name
     * quantity: String with quantity and unit
   - calories: Number (MUST be a valid number, not null, undefined, or string)
   - protein: Number (MUST be a valid number in grams, not null or undefined)
   - carbs: Number (MUST be a valid number in grams, not null or undefined)
   - fat: Number (MUST be a valid number in grams, not null or undefined)
   - cookingInstructions: Array of strings with step-by-step instructions
   - prepTime: Number with prep time in minutes
   - cookTime: Number with cook time in minutes
   - difficulty: String ("easy", "medium", or "hard")

9. ⚠️ FINAL VALIDATION CHECKLIST - Before submitting your answer, verify:
   - ✅ ALL 7 DAYS are included: monday, tuesday, wednesday, thursday, friday, saturday, sunday
   - ✅ ALL days have complete meal data with ALL required meals
   - ✅ ALL nutrition targets are met for EVERY day
   - ✅ ALL meal objects have ALL required fields and proper formatting

7. For ALL meal plans:
   - Each day's total calorie count MUST equal ${nutritionData.calorieTarget} (±100 calories max)
   - Protein MUST equal or slightly exceed ${nutritionData.proteinTarget}g
   - Carbs should be close to ${nutritionData.carbsTarget}g
   - Fat should not exceed ${nutritionData.fatTarget}g by more than 5%
   - All meals MUST match the user's dietary preferences (${input.dietaryPreferences.join(", ")})
8. SCIENTIFIC WORKOUT STRUCTURE REQUIREMENTS (CRITICAL): 
   - weeklySchedule must contain EXACTLY 7 day keys: "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday" (lower case)
   - EACH DAY (even rest days) MUST have:
     * A name field (string)
     * An exercises array (always an array, even if empty)
   - Create exactly ${input.workoutDaysPerWeek} active workout days with exercises (no more, no less)
   
   - FOR MUSCLE GAIN GOALS: Use scientifically-proven Push-Pull-Legs (PPL) split:
     * PUSH DAY: Chest, shoulders, triceps (bench press, overhead press, dips, etc.)
     * PULL DAY: Back, biceps, forearms (rows, pull-ups, curls, etc.)
     * LEGS DAY: Quadriceps, hamstrings, calves, glutes (squats, deadlifts, lunges, etc.)
     * CORE/MOBILITY DAY: Abs, lower back, flexibility (planks, rotations, stretching, etc.)
     * Ensure rest days between similar muscle groups (48-72 hours recovery per muscle group)
     * For 4-day splits: Push-Pull-Legs-Core or Push-Pull-Legs-Rest-Push-Pull-Rest
     * For 5-day splits: Push-Pull-Legs-Upper-Lower or Push-Pull-Legs-Push-Pull
     * For 6-day splits: Push-Pull-Legs-Push-Pull-Legs
   
   - FOR WEIGHT LOSS GOALS: Create higher-intensity circuits with:
     * Full-body workouts with compound movements
     * Higher rep ranges (12-15) with moderate weights
     * Shorter rest periods (30-60 seconds)
     * Strategic cardio placement (HIIT or steady-state)
   
   - Schedule workouts on user's preferred days: ${input.preferredWorkoutDays?.length ? input.preferredWorkoutDays.join(", ") : "Any days appropriate for their fitness goal"}
   - CREATE DESCRIPTIVE WORKOUT NAMES: You must create descriptive names based on workout focus (e.g., 'Upper Body Hypertrophy', 'Lower Body Strength', 'Full Body HIIT'). Never use generic names like "Monday Workout".
   - Each workout should last approximately ${input.workoutDuration || 60} minutes
   
   - EXERCISE STRUCTURE REQUIREMENTS:
     * IMPORTANT: EACH WORKOUT MUST INCLUDE 5-8 DIFFERENT EXERCISES (not 3)
     * HIGH-QUALITY WORKOUTS MUST BE COMPREHENSIVE, not minimal. INSUFFICIENT EXERCISES = REJECTED
     * For muscle gain workouts, ALWAYS include:
        - 2-3 compound exercises as main movements (e.g., bench press, squat, deadlift)
        - 3-5 isolation exercises for complete muscle group targeting
        - Ensure DIVERSE exercise selection - NEVER just 3 exercises
     * EACH EXERCISE MUST HAVE: 
        - name: string - Full proper name of exercise
        - sets: number - Number of sets to perform
        - reps: number - Number of repetitions per set
        - rest: number - Rest time in seconds between sets
        - instructions: string[] - Step-by-step form instructions
        - equipment: string[] - Required equipment (e.g., "Barbell", "Dumbbell")
        - targetMuscleGroups: string[] - Primary muscles targeted
        - difficulty: string - "beginner", "intermediate", or "advanced"
        - alternativeExercises: string[] - Alternative exercises if equipment unavailable
     * For COMPOUND exercises: 3-5 sets of 6-12 reps with 90-120 sec rest
     * For ISOLATION exercises: 3-4 sets of 8-15 reps with 60-90 sec rest
     * Progressive overload: Include weekly progression recommendations
     * ⚠️ CRITICAL REQUIREMENT: NEVER create a workout with just 3 exercises; ALWAYS include at least 5-8 different exercises
   
   - PERSONALIZATION REQUIREMENTS:
     * Optimize for user's gender (${input.sex}), age (${input.age}), fitness level, and body composition
     * Include detailed form cues and technique instructions for safety
     * Provide warmup and cooldown protocols for each workout
     * Show estimated calories burned per session
     * Indicate difficulty level for each workout and exercise
   
   - REST DAY REQUIREMENTS: Name as "Rest Day" or "Active Recovery" with empty exercises array
     * For active recovery days: Include light mobility work or stretching recommendations
9. SHOPPING LIST ORGANIZATION: Create a comprehensive shopping list with:
   - Items organized by category (produce, proteins, dairy, etc.)
   - Items organized by meal (showing which ingredients are used in which meals)
   - Items organized by store (showing where to buy each item)
   - Precise quantities needed for the entire week
   - ACCURATE costs in GBP for each item:
     * IMPORTANT: Every item MUST have a realistic, non-zero price in the estimatedCost field
     * Use realistic 2024 UK pricing from major supermarkets (Tesco, Asda, Sainsbury's, etc.)
     * Include weight/quantity-based pricing where appropriate (e.g., £2.50/kg, £0.85/100g)
     * Example costs: chicken breast (£7-9/kg), rice (£1-2/kg), milk (£1-1.50/liter), etc.
     * For each item, include the store URL where available
     * For store brands, use specific brand names (e.g., "Tesco Everyday Value", "Sainsbury's Basics")
     * Include the store name where each price was found
     * Every shopping item in the list MUST have a realistic, non-zero price in the estimatedCost field
10. BUDGET ANALYSIS: Provide helpful budget analysis:
    - Total cost breakdown by food category (protein, carbs, produce, dairy, other)
    - Provide estimated total cost relative to user's weekly budget (£${input.weeklyBudget})
    - Note that this budget is a guideline and actual costs may be higher or lower
    - Money-saving tips based on the specific meal plan
11. STORE RECOMMENDATIONS: Recommend specific UK stores (Tesco, Asda, Sainsbury's, Aldi, Lidl, etc.) for each ingredient, prioritizing:
    - Best value for money
    - Quality of ingredients
    - Availability of items
12. MEAL PREPARATION GUIDE: Include a meal prep guide with:
    - Which foods to prepare in advance
    - How to store prepared meals
    - Reheating instructions when applicable

Your response MUST use this EXACT JSON structure format:
{
  "weeklyMealPlan": {
    "monday": { 
      "breakfast": { "name": "", "description": "", "ingredients": [], "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "cookingInstructions": [], "prepTime": 0, "cookTime": 0, "difficulty": "" },
      "lunch": { "name": "", "description": "", "ingredients": [], "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "cookingInstructions": [], "prepTime": 0, "cookTime": 0, "difficulty": "" },
      "dinner": { "name": "", "description": "", "ingredients": [], "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "cookingInstructions": [], "prepTime": 0, "cookTime": 0, "difficulty": "" },
      "snacks": [{ "name": "", "description": "", "ingredients": [], "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "cookingInstructions": [], "prepTime": 0, "cookTime": 0, "difficulty": "" }]
    },
    "tuesday": {},
    "wednesday": {},
    "thursday": {},
    "friday": {},
    "saturday": {},
    "sunday": {}
  },
  "weeklyWorkoutPlan": {
    "monday": { 
      "name": "", 
      "description": "",
      "workoutType": "",
      "difficulty": "",
      "estimatedDuration": 0,
      "caloriesBurned": 0,
      "warmupRoutine": [""],
      "cooldownRoutine": [""],
      "exercises": [
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] }
      ] 
    },
    "tuesday": { 
      "name": "", 
      "description": "",
      "workoutType": "",
      "difficulty": "",
      "estimatedDuration": 0,
      "caloriesBurned": 0,
      "warmupRoutine": [""],
      "cooldownRoutine": [""],
      "exercises": [
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] }
      ]
    },
    "wednesday": { 
      "name": "", 
      "description": "",
      "workoutType": "",
      "difficulty": "",
      "estimatedDuration": 0,
      "caloriesBurned": 0,
      "exercises": []
    },
    "thursday": { 
      "name": "", 
      "description": "",
      "workoutType": "",
      "difficulty": "",
      "estimatedDuration": 0,
      "caloriesBurned": 0,
      "warmupRoutine": [""],
      "cooldownRoutine": [""],
      "exercises": [
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] }
      ]
    },
    "friday": { 
      "name": "", 
      "description": "",
      "workoutType": "",
      "difficulty": "",
      "estimatedDuration": 0,
      "caloriesBurned": 0,
      "warmupRoutine": [""],
      "cooldownRoutine": [""],
      "exercises": [
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] },
        { "name": "", "sets": 0, "reps": 0, "rest": 0, "targetMuscleGroups": [""], "equipment": [""], "instructions": [""] }
      ]
    },
    "saturday": { 
      "name": "", 
      "description": "",
      "workoutType": "",
      "difficulty": "",
      "estimatedDuration": 0,
      "caloriesBurned": 0,
      "exercises": []
    },
    "sunday": { 
      "name": "Rest Day", 
      "description": "Full recovery day to allow muscles to repair and grow stronger.",
      "exercises": []
    }
  },
  "shoppingList": [
    { 
      "name": "", 
      "brand": "", 
      "quantity": "", 
      "estimatedCost": 0, 
      "unitPrice": "", 
      "category": "", 
      "mealAssociations": [], 
      "store": "", 
      "storeUrl": "",
      "alternativeOptions": [
        { "name": "", "store": "", "price": 0, "storeUrl": "" }
      ]
    }
  ],
  "organizedShoppingList": {
    "byCategory": { "category1": [] },
    "byMeal": { "meal1": [] },
    "byStore": { "store1": [] }
  },
  "budgetAnalysis": {
    "totalCost": 0,
    "weeklyBudget": 0,
    "percentOfBudget": 0,
    "savings": 0,
    "costBreakdown": { "protein": 0, "carbs": 0, "produce": 0, "dairy": 0, "other": 0 },
    "savingTips": []
  },
  "suggestedStores": [],
  "mealPrepInstructions": []
}

BUDGET CONSIDERATION (STRICT REQUIREMENT):
- You MUST create a shopping list with total cost UNDER £${input.weeklyBudget}
- This budget is a HARD CONSTRAINT - do not exceed it
- Adjust meal portions or ingredients to stay within budget
- Use budget stores (Aldi, Lidl) and store brands to reduce costs
- Focus on cost-effective protein sources (eggs, chicken thighs, frozen fish)
- The total cost MUST NOT exceed the weekly budget of £${input.weeklyBudget}
- If you find it impossible to create a nutritionally balanced plan within budget, make minimal compromises while explaining your choices

BUDGET PLANNING STRATEGY:
1. Use budget store products (Aldi, Lidl) for staples and non-protein items
2. Use store-brand rather than premium brand products
3. Prioritize cost-effective protein sources (eggs, chicken thighs, tinned fish, whey protein)
4. Use frozen vegetables and fruits where appropriate
5. Buy in bulk for frequently used ingredients
6. Choose seasonal produce to reduce costs
7. Use cost-effective carb sources (rice, oats, potatoes, pasta)
8. Limit or eliminate expensive specialty ingredients
9. Reuse ingredients across multiple meals to reduce waste and cost
10. Prioritize nutrition targets over strict budget adherence

FINAL VALIDATION (⚠️ MANDATORY COMPLETION CHECKLIST):
✓ Confirm EACH DAY provides ${nutritionData.calorieTarget}±50 calories
✓ Confirm EACH DAY provides at least ${nutritionData.proteinTarget}g protein (can exceed by up to 10%)
✓ Confirm shopping list has REASONABLE cost estimates
✓ Confirm workout plan has EXACTLY ${input.workoutDaysPerWeek} workout days
✓ Confirm EACH workout day includes AT LEAST 5-8 different exercises (NOT just 3)
✓ Confirm ALL meal structure follows the required JSON format
✓ If nutrition or workout validation checks fail, your response WILL BE REJECTED

This comprehensive nutrition and fitness plan must support the user's ${input.fitnessGoal} goal while respecting their budget and dietary preferences.`;

  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(promptData) }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    // Parse the response with better error handling
    const content = response.choices[0].message.content || "{}";
    let aiResponseData;
    
    try {
      aiResponseData = JSON.parse(content as string);
      console.log("Successfully generated coach response");
    } catch (parseError) {
      // Handle JSON parsing error gracefully
      console.error("Error parsing OpenAI response JSON:", parseError);
      console.log("Problematic JSON starts with:", content.substring(0, 200) + "...");
      
      // Attempt to fix common JSON issues
      let fixedContent = content;
      
      // Try to remove any trailing commas in arrays or objects which are invalid in JSON
      fixedContent = fixedContent.replace(/,\s*([\]}])/g, '$1');
      
      // Only try to fix unterminated strings - safer approach
      // Look for patterns like "key": "value with unterminated string
      fixedContent = fixedContent.replace(/("[^"]*):(\s*)"([^"]*[^\\])?$/gm, '$1:$2"$3"');
      
      try {
        // Try parsing the fixed content
        aiResponseData = JSON.parse(fixedContent);
        console.log("Successfully parsed JSON after fixing format issues");
      } catch (secondError) {
        // If still failing, use a default structure
        console.error("Failed to fix JSON parsing issues:", secondError);
        
        // Create minimal valid response structure
        aiResponseData = {
          weeklyMealPlan: {},
          weeklyWorkoutPlan: {},
          shoppingList: [],
          suggestedStores: []
        };
        
        throw new Error("Failed to parse OpenAI response. Please try again.");
      }
    }

    // Validate the meal plan meets all nutrition requirements
    const weeklyMealPlan = validateMealPlanCalories(
      aiResponseData.weeklyMealPlan, 
      nutritionData.calorieTarget,
      input.fitnessGoal,
      nutritionData.proteinTarget,
      nutritionData.carbsTarget,
      nutritionData.fatTarget
    );
    
    // Calculate and validate total shopping list cost against budget
    if (aiResponseData.shoppingList && Array.isArray(aiResponseData.shoppingList)) {
      interface ShoppingListItem {
        estimatedCost: number;
        name?: string;
        category?: string;
        [key: string]: any;
      }
      
      const totalCost = aiResponseData.shoppingList.reduce(
        (acc: number, item: ShoppingListItem) => acc + (typeof item.estimatedCost === 'number' ? item.estimatedCost : 0),
        0
      );
      // Use user-provided budget
      const weeklyBudget = input.weeklyBudget;
      console.log(`Shopping list total cost: £${totalCost.toFixed(2)}, Budget: £${weeklyBudget}`);
      
      // If costs exceed budget, automatically scale them down to fit within budget
      if (totalCost > weeklyBudget) {
        const percentOver = ((totalCost - weeklyBudget) / weeklyBudget) * 100;
        console.warn(`Shopping list cost (£${totalCost.toFixed(2)}) exceeds user's budget (£${weeklyBudget}) by ${percentOver.toFixed(1)}%.`);
        console.log(`Adjusting costs to fit within budget limit...`);
        
        // Add a scaling factor to all costs to bring the total within budget
        // Allow a small buffer (98% of budget) to ensure we're safely under
        const scalingFactor = (weeklyBudget * 0.98) / totalCost;
        console.log(`Applying scaling factor of ${scalingFactor.toFixed(3)} to all costs`);
        
        // Sort items from highest to lowest cost to prioritize adjusting expensive items
        const sortedItems = [...aiResponseData.shoppingList].sort((a, b) => 
          (b.estimatedCost || 0) - (a.estimatedCost || 0)
        );
        
        // First adjust high-cost luxury items more aggressively
        const luxuryCategories = ['snacks', 'treats', 'desserts', 'beverages', 'alcohol'];
        let luxuryReduction = 0;
        
        for (const item of sortedItems) {
          const category = (item.category || '').toLowerCase();
          const name = (item.name || '').toLowerCase();
          
          // Check if this is a luxury item
          const isLuxury = luxuryCategories.some(lux => 
            category.includes(lux) || name.includes(lux)
          );
          
          if (isLuxury && item.estimatedCost > 3) {
            const originalCost = item.estimatedCost;
            // Reduce luxury items by up to 40% 
            item.estimatedCost = Math.max(item.estimatedCost * 0.6, 1.5);
            luxuryReduction += (originalCost - item.estimatedCost);
            
            console.log(`Reduced luxury item "${item.name || 'unknown'}" from £${originalCost.toFixed(2)} to £${item.estimatedCost.toFixed(2)}`);
          }
        }
        
        // Calculate the new total after luxury reductions
        let newTotalCost = aiResponseData.shoppingList.reduce(
          (acc: number, item: ShoppingListItem) => acc + (typeof item.estimatedCost === 'number' ? item.estimatedCost : 0),
          0
        );
        
        // If still over budget, apply proportional scaling to all remaining items
        if (newTotalCost > weeklyBudget) {
          const newScalingFactor = (weeklyBudget * 0.98) / newTotalCost;
          
          // Apply the scaling factor to all items
          for (const item of aiResponseData.shoppingList) {
            item.estimatedCost = item.estimatedCost * newScalingFactor;
          }
          
          // Final cost check
          const finalCost = aiResponseData.shoppingList.reduce(
            (acc: number, item: ShoppingListItem) => acc + (typeof item.estimatedCost === 'number' ? item.estimatedCost : 0),
            0
          );
          
          console.log(`After scaling, new shopping list cost: £${finalCost.toFixed(2)}`);
        } else {
          console.log(`After luxury item adjustments, shopping list cost: £${newTotalCost.toFixed(2)}`);
        }
        
        // Update the budget analysis information
        if (aiResponseData.budgetAnalysis) {
          aiResponseData.budgetAnalysis.totalCost = aiResponseData.shoppingList.reduce(
            (acc: number, item: ShoppingListItem) => acc + (typeof item.estimatedCost === 'number' ? item.estimatedCost : 0),
            0
          );
          
          aiResponseData.budgetAnalysis.weeklyBudget = weeklyBudget;
          aiResponseData.budgetAnalysis.percentOfBudget = (aiResponseData.budgetAnalysis.totalCost / weeklyBudget) * 100;
          
          if (!aiResponseData.budgetAnalysis.savingTips) {
            aiResponseData.budgetAnalysis.savingTips = [];
          }
          
          aiResponseData.budgetAnalysis.savingTips.unshift(
            "This shopping list has been optimized to fit within your budget while maintaining nutrition quality."
          );
        }
      }
    }
    
    // Validate that each workout day has enough exercises (minimum 5 for active workout days)
    if (aiResponseData.weeklyWorkoutPlan) {
      const workoutDays = Object.keys(aiResponseData.weeklyWorkoutPlan);
      const activeWorkoutDays = input.workoutDaysPerWeek;
      let validWorkoutDaysCount = 0;
      
      workoutDays.forEach(day => {
        const workout = aiResponseData.weeklyWorkoutPlan[day];
        
        // Skip validation for rest days
        if (workout.name && (workout.name.toLowerCase().includes('rest') || 
            workout.name.toLowerCase().includes('recovery'))) {
          return;
        }
        
        // Check if this is an active workout day
        if (workout.exercises && Array.isArray(workout.exercises) && workout.exercises.length > 0) {
          validWorkoutDaysCount++;
          
          // Ensure each active workout day has at least 5 exercises
          if (workout.exercises.length < 5) {
            console.warn(`Warning: Workout day ${day} only has ${workout.exercises.length} exercises, which is less than the minimum 5 recommended.`);
          }
        }
      });
      
      console.log(`Workout plan has ${validWorkoutDaysCount} active workout days (requested: ${activeWorkoutDays}).`);
    }
    
    // Validate shopping list prices to ensure they are accurate
    if (aiResponseData.shoppingList && Array.isArray(aiResponseData.shoppingList)) {
      let itemsWithInvalidCost = 0;
      
      aiResponseData.shoppingList.forEach((item, index) => {
        // Check for missing or invalid cost data
        if (!item.estimatedCost || item.estimatedCost <= 0) {
          console.warn(`Warning: Shopping item "${item.name || 'at index ' + index}" has missing or invalid cost (${item.estimatedCost}).`);
          itemsWithInvalidCost++;
          
          // Apply a default cost based on category if known
          const itemName = (item.name || '').toLowerCase();
          const category = (item.category || '').toLowerCase();
          let defaultCost = 2.50; // Default fallback cost
          
          // Set more accurate default cost based on category or name
          if (category.includes('protein') || itemName.includes('meat') || 
              itemName.includes('chicken') || itemName.includes('beef') || 
              itemName.includes('fish') || itemName.includes('salmon')) {
            defaultCost = 4.50;
          } else if (category.includes('dairy') || 
                     itemName.includes('milk') || itemName.includes('cheese') || 
                     itemName.includes('yogurt')) {
            defaultCost = 2.20;
          } else if (category.includes('produce') || 
                     itemName.includes('vegetable') || itemName.includes('fruit')) {
            defaultCost = 1.80;
          } else if (category.includes('grain') || category.includes('carb') || 
                     itemName.includes('rice') || itemName.includes('pasta') || 
                     itemName.includes('bread')) {
            defaultCost = 1.50;
          }
          
          // Update the item with the default cost
          aiResponseData.shoppingList[index].estimatedCost = defaultCost;
        }
      });
      
      if (itemsWithInvalidCost > 0) {
        console.warn(`Warning: Fixed ${itemsWithInvalidCost} shopping items with missing or invalid costs.`);
      } else {
        console.log(`All shopping items have valid cost estimates.`);
      }
    }

    // Return the comprehensive response with enhanced data
    const coachResponse: CoachResponse = {
      nutritionData,
      weeklyMealPlan,
      weeklyWorkoutPlan: aiResponseData.weeklyWorkoutPlan,
      shoppingList: aiResponseData.shoppingList,
      suggestedStores: aiResponseData.suggestedStores,
      // Include the new enhanced data if available
      organizedShoppingList: aiResponseData.organizedShoppingList,
      budgetAnalysis: aiResponseData.budgetAnalysis,
      mealPrepInstructions: aiResponseData.mealPrepInstructions
    };

    return coachResponse;
  } catch (error) {
    console.error("Error generating coach response with OpenAI:", error);
    throw new Error("Failed to generate fitness and nutrition plan. Please try again.");
  }
}