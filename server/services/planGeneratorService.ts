/**
 * Plan Generator Service
 * Core logic for generating personalized fitness and meal plans using OpenAI
 */

import OpenAI from "openai";
import { User } from "@shared/schema";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const AI_MODEL = "gpt-4o";

/**
 * Nutritional data for a user based on their profile
 */
export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  bmr: number;
  tdee: number;
}

/**
 * Food item for grocery list
 */
export interface FoodItem {
  name: string;
  quantity: string;
  unit: string;
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  usedIn: string[]; // List of meals this item is used in
}

/**
 * Structure for grocery list with budget allocation
 */
export interface GroceryList {
  items: FoodItem[];
  totalCost: number;
  budgetAllocation: {
    protein: number;
    carbs: number;
    fruits: number;
    vegetables: number;
    dairy: number;
    other: number;
  };
}

/**
 * Exercise structure with sets, reps, etc.
 */
export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rest: number; // Rest time in seconds
  weight?: number | null; // Weight in kg or lbs (if applicable)
  notes?: string;
}

/**
 * Workout structure containing exercises and metadata
 */
export interface Workout {
  name: string;
  workoutType: string;
  targetMuscleGroups: string[];
  exercises: Exercise[];
  duration: number; // Estimated duration in minutes
  caloriesBurned: number; // Estimated calories burned
}

/**
 * Complete workout plan with weekly schedule
 */
export interface WorkoutPlan {
  weeklySchedule: {
    [day: string]: Workout;
  };
  notes: string;
}

/**
 * Individual meal structure with ingredients and nutritional information
 */
export interface Meal {
  name: string;
  description: string;
  ingredients: {
    name: string;
    quantity: string;
    unit: string;
  }[];
  instructions: string[];
  prepTime: number; // In minutes
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  cost: number; // Estimated cost in specified currency
}

/**
 * Daily meal plan with all meals for a day
 */
export interface DailyMealPlan {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snacks: Meal[];
  // Optional additional meals
  pre_workout?: Meal;
  post_workout?: Meal;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalCost: number;
}

/**
 * Complete meal plan with meals for each day of the week
 */
export interface MealPlan {
  weeklyMeals: {
    [day: string]: DailyMealPlan;
  };
  notes: string;
}

/**
 * Plan generation request with user and preferences
 */
export interface PlanGenerationRequest {
  user: User;
  preferences: {
    fitnessGoal: string;
    workoutDaysPerWeek: number;
    dietPreferences: string[];
    restrictions: string[];
    weeklyBudget: number;
    budgetCurrency: string;
    activityLevel: string;
    workoutDuration: number;
    fitnessLevel: string;
  };
}

/**
 * Progress update during plan generation
 */
export interface PlanGenerationProgressUpdate {
  userId: number;
  isGenerating: boolean;
  startedAt: Date;
  updatedAt: Date;
  currentStep: number;
  totalSteps: number;
  stepMessage: string;
  estimatedTimeRemaining: number;
  errorMessage?: string;
  retryCount: number;
  dataJson?: string;
}

/**
 * Complete fitness plan generation result
 */
export interface PlanGenerationResult {
  nutritionData: NutritionData;
  workoutPlan: WorkoutPlan;
  mealPlan: MealPlan;
  groceryList: GroceryList;
  summary: {
    fitnessGoal: string;
    weeklyWorkouts: number;
    dailyCalories: number;
    weeklyCost: number;
    dietType: string;
    adaptations: string[];
  };
}

/**
 * Calculates BMR (Basal Metabolic Rate) using the Mifflin-St Jeor equation
 */
function calculateBMR(user: User): number {
  const weight = user.weight || 70; // Default to 70kg if weight not provided
  const height = user.height || 170; // Default to 170cm if height not provided
  const age = user.age || 30; // Default to 30 years if age not provided
  const isMale = user.gender === 'male';

  if (isMale) {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

/**
 * Calculates TDEE (Total Daily Energy Expenditure) based on BMR and activity level
 */
function calculateTDEE(bmr: number, activityLevel: string): number {
  const activityMultipliers: { [key: string]: number } = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'very_active': 1.725,
    'extra_active': 1.9
  };

  const multiplier = activityMultipliers[activityLevel] || 1.375;
  return Math.round(bmr * multiplier);
}

/**
 * Adjusts TDEE based on fitness goal
 */
function adjustCaloriesForGoal(tdee: number, fitnessGoal: string): number {
  switch (fitnessGoal) {
    case 'weightLoss':
      return Math.round(tdee * 0.8); // 20% deficit for weight loss
    case 'muscleBuild':
      return Math.round(tdee * 1.1); // 10% surplus for muscle gain
    default:
      return tdee; // Maintenance for other goals
  }
}

/**
 * Calculates macro targets based on adjusted calorie intake and fitness goal
 */
function calculateMacroTargets(adjustedCalories: number, fitnessGoal: string, weight: number): {
  protein: number;
  carbs: number;
  fat: number;
} {
  let proteinRatio, carbRatio, fatRatio;

  switch (fitnessGoal) {
    case 'weightLoss':
      proteinRatio = 0.40; // Higher protein for weight loss
      fatRatio = 0.35;
      carbRatio = 0.25;
      break;
    case 'muscleBuild':
      proteinRatio = 0.30; // High protein for muscle building
      carbRatio = 0.45; // Higher carbs for energy
      fatRatio = 0.25;
      break;
    case 'strength':
      proteinRatio = 0.30;
      carbRatio = 0.40;
      fatRatio = 0.30;
      break;
    default: // General fitness or stamina
      proteinRatio = 0.25;
      carbRatio = 0.50;
      fatRatio = 0.25;
      break;
  }

  // Calculate grams of each macro
  const protein = Math.round((adjustedCalories * proteinRatio) / 4); // 4 calories per gram of protein
  const carbs = Math.round((adjustedCalories * carbRatio) / 4); // 4 calories per gram of carbs
  const fat = Math.round((adjustedCalories * fatRatio) / 9); // 9 calories per gram of fat

  return { protein, carbs, fat };
}

/**
 * Creates a progress update object for tracking plan generation
 */
export function createProgressUpdate(userId: number, step: number, message: string, totalSteps = 6): PlanGenerationProgressUpdate {
  return {
    userId,
    isGenerating: true,
    startedAt: new Date(),
    updatedAt: new Date(),
    currentStep: step,
    totalSteps,
    stepMessage: message,
    estimatedTimeRemaining: (totalSteps - step + 1) * 30, // 30 seconds per remaining step
    retryCount: 0
  };
}

/**
 * Updates progress with partial data
 */
export function updateProgressWithData(
  progress: PlanGenerationProgressUpdate, 
  data: Partial<PlanGenerationResult>
): PlanGenerationProgressUpdate {
  return {
    ...progress,
    updatedAt: new Date(),
    dataJson: JSON.stringify({
      ...JSON.parse(progress.dataJson || '{}'),
      ...data,
      isComplete: progress.currentStep >= progress.totalSteps
    })
  };
}

/**
 * Generates a workout plan based on user preferences
 */
async function generateWorkoutPlan(request: PlanGenerationRequest): Promise<WorkoutPlan> {
  const { user, preferences } = request;
  console.log(`[PlanGenerator] Generating workout plan for user ${user.id}`);
  
  try {
    const prompt = `
Create a detailed weekly workout plan for a ${user.gender || 'person'} with the following parameters:
- Age: ${user.age || 'Not specified'}
- Height: ${user.height || 'Not specified'} ${user.heightUnit || 'cm'}
- Weight: ${user.weight || 'Not specified'} ${user.weightUnit || 'kg'}
- Fitness goal: ${preferences.fitnessGoal}
- Fitness level: ${preferences.fitnessLevel}
- Workout days per week: ${preferences.workoutDaysPerWeek}
- Maximum workout duration: ${preferences.workoutDuration} minutes
- Activity level: ${preferences.activityLevel}

Format requirements:
1. The workouts should follow a logical progression with appropriate rest days
2. Each workout should have a name, type, target muscle groups, and a list of exercises
3. Each exercise should include sets, reps, rest periods, and any required equipment
4. Include warm-up and cool-down recommendations
5. Response must be valid JSON matching this format:
{
  "weeklySchedule": {
    "monday": {
      "name": "string",
      "workoutType": "string",
      "targetMuscleGroups": ["string"],
      "exercises": [
        {
          "name": "string",
          "sets": number,
          "reps": number,
          "rest": number,
          "weight": number (optional),
          "notes": "string" (optional)
        }
      ],
      "duration": number,
      "caloriesBurned": number
    },
    ... (other days)
  },
  "notes": "string with general advice"
}`;

    // Generate the workout plan using OpenAI
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: "You are a certified personal trainer and exercise specialist." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to generate workout plan: Empty response");
    }

    console.log(`[PlanGenerator] Successfully generated workout plan for user ${user.id}`);
    
    const workoutPlan: WorkoutPlan = JSON.parse(content);
    return workoutPlan;
  } catch (error: any) {
    console.error(`[PlanGenerator] Error generating workout plan:`, error);
    throw new Error(`Failed to generate workout plan: ${error.message}`);
  }
}

/**
 * Generates a meal plan based on user preferences and calculated nutrition needs
 */
async function generateMealPlan(
  request: PlanGenerationRequest, 
  nutritionData: NutritionData
): Promise<MealPlan> {
  const { user, preferences } = request;
  console.log(`[PlanGenerator] Generating meal plan for user ${user.id}`);
  
  try {
    const prompt = `
Create a detailed weekly meal plan for a ${user.gender || 'person'} with the following parameters:
- Age: ${user.age || 'Not specified'}
- Height: ${user.height || 'Not specified'} ${user.heightUnit || 'cm'}
- Weight: ${user.weight || 'Not specified'} ${user.weightUnit || 'kg'}
- Daily calorie target: ${nutritionData.calories} calories
- Protein target: ${nutritionData.protein}g
- Carbs target: ${nutritionData.carbs}g
- Fat target: ${nutritionData.fat}g
- Dietary preferences: ${preferences.dietPreferences.join(', ')}
- Dietary restrictions: ${preferences.restrictions.join(', ')}
- Weekly budget: ${preferences.weeklyBudget} ${preferences.budgetCurrency}

Format requirements:
1. Plan must include breakfast, lunch, dinner, and snacks for each day
2. Include pre-workout and post-workout meals on workout days
3. Each meal must include name, description, ingredients with quantities, instructions, prep time, and nutritional information
4. Meals should be varied but utilize common ingredients to minimize waste and maximize the budget
5. Use realistic portion sizes based on common packaging (e.g., full eggs, not 1.3 eggs)
6. Response must be valid JSON matching this format:
{
  "weeklyMeals": {
    "monday": {
      "breakfast": {
        "name": "string",
        "description": "string",
        "ingredients": [
          {
            "name": "string",
            "quantity": "string",
            "unit": "string"
          }
        ],
        "instructions": ["string"],
        "prepTime": number,
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "cost": number
      },
      "lunch": { meal object },
      "dinner": { meal object },
      "snacks": [{ meal object }],
      "pre_workout": { meal object } (optional),
      "post_workout": { meal object } (optional),
      "totalCalories": number,
      "totalProtein": number,
      "totalCarbs": number,
      "totalFat": number,
      "totalCost": number
    },
    ... (other days)
  },
  "notes": "string with general advice"
}`;

    // Generate the meal plan using OpenAI
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: "You are a certified nutritionist and meal planning specialist." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to generate meal plan: Empty response");
    }

    console.log(`[PlanGenerator] Successfully generated meal plan for user ${user.id}`);
    
    const mealPlan: MealPlan = JSON.parse(content);
    return mealPlan;
  } catch (error: any) {
    console.error(`[PlanGenerator] Error generating meal plan:`, error);
    throw new Error(`Failed to generate meal plan: ${error.message}`);
  }
}

/**
 * Extracts ingredients from the meal plan to create an optimized grocery list
 */
async function generateGroceryList(
  request: PlanGenerationRequest, 
  mealPlan: MealPlan
): Promise<GroceryList> {
  const { user, preferences } = request;
  console.log(`[PlanGenerator] Generating grocery list for user ${user.id}`);
  
  try {
    const mealPlanJson = JSON.stringify(mealPlan);
    
    const prompt = `
Analyze this weekly meal plan and create an optimized grocery shopping list with the following requirements:
- Weekly budget: ${preferences.weeklyBudget} ${preferences.budgetCurrency}
- Dietary preferences: ${preferences.dietPreferences.join(', ')}
- Dietary restrictions: ${preferences.restrictions.join(', ')}

Weekly meal plan details:
${mealPlanJson}

Requirements:
1. Consolidate ingredients across all meals (e.g., if multiple meals use eggs, combine the quantities)
2. For each item, include name, quantity, unit, price, nutritional info, and which meals it's used in
3. Calculate the total cost and ensure it stays within the weekly budget
4. Create a budget allocation breakdown by food category
5. Response must be valid JSON matching this format:
{
  "items": [
    {
      "name": "string",
      "quantity": "string",
      "unit": "string",
      "price": number,
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "usedIn": ["string"] (list of meal names this item is used in)
    }
  ],
  "totalCost": number,
  "budgetAllocation": {
    "protein": number,
    "carbs": number,
    "fruits": number,
    "vegetables": number,
    "dairy": number,
    "other": number
  }
}`;

    // Generate the grocery list using OpenAI
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: "You are a meal planning and budgeting specialist." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to generate grocery list: Empty response");
    }

    console.log(`[PlanGenerator] Successfully generated grocery list for user ${user.id}`);
    
    const groceryList: GroceryList = JSON.parse(content);
    return groceryList;
  } catch (error: any) {
    console.error(`[PlanGenerator] Error generating grocery list:`, error);
    throw new Error(`Failed to generate grocery list: ${error.message}`);
  }
}

/**
 * Creates a summary of the overall fitness plan
 */
function createPlanSummary(
  request: PlanGenerationRequest,
  nutritionData: NutritionData,
  workoutPlan: WorkoutPlan,
  mealPlan: MealPlan,
  groceryList: GroceryList
): PlanGenerationResult['summary'] {
  const { preferences } = request;
  
  // Extract diet type from preferences
  const dietType = preferences.dietPreferences.length > 0 
    ? preferences.dietPreferences.join(', ') 
    : 'Balanced';
  
  // Create adaptations based on preferences and restrictions
  const adaptations = [
    ...preferences.dietPreferences.map(pref => `Adapted for ${pref} diet`),
    ...preferences.restrictions.map(rest => `Excludes ${rest}`),
  ];
  
  // If budget is tight, add that as an adaptation
  if (groceryList.totalCost > preferences.weeklyBudget * 0.9) {
    adaptations.push('Optimized for budget constraints');
  }
  
  return {
    fitnessGoal: preferences.fitnessGoal,
    weeklyWorkouts: preferences.workoutDaysPerWeek,
    dailyCalories: nutritionData.calories,
    weeklyCost: groceryList.totalCost,
    dietType,
    adaptations
  };
}

/**
 * Main function to generate a complete personalized fitness plan
 */
export async function generatePersonalizedPlan(
  request: PlanGenerationRequest,
  progressCallback?: (progress: PlanGenerationProgressUpdate) => Promise<void>
): Promise<PlanGenerationResult> {
  const { user, preferences } = request;
  console.log(`[PlanGenerator] Starting personalized plan generation for user ${user.id}`);
  
  try {
    // Step 1: Calculate nutrition requirements
    if (progressCallback) {
      await progressCallback(createProgressUpdate(user.id, 1, 'Calculating nutrition requirements...'));
    }
    
    const bmr = calculateBMR(user);
    const tdee = calculateTDEE(bmr, preferences.activityLevel);
    const adjustedCalories = adjustCaloriesForGoal(tdee, preferences.fitnessGoal);
    const macros = calculateMacroTargets(adjustedCalories, preferences.fitnessGoal, user.weight || 70);
    
    const nutritionData: NutritionData = {
      calories: adjustedCalories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      bmr,
      tdee
    };
    
    // Step 2: Generate workout plan
    if (progressCallback) {
      await progressCallback(
        updateProgressWithData(
          createProgressUpdate(user.id, 2, 'Generating workout plan...'), 
          { nutritionData }
        )
      );
    }
    
    const workoutPlan = await generateWorkoutPlan(request);
    
    // Step 3: Generate meal plan
    if (progressCallback) {
      await progressCallback(
        updateProgressWithData(
          createProgressUpdate(user.id, 3, 'Creating meal plan...'), 
          { nutritionData, workoutPlan }
        )
      );
    }
    
    const mealPlan = await generateMealPlan(request, nutritionData);
    
    // Step 4: Generate grocery list
    if (progressCallback) {
      await progressCallback(
        updateProgressWithData(
          createProgressUpdate(user.id, 4, 'Building grocery list...'), 
          { nutritionData, workoutPlan, mealPlan }
        )
      );
    }
    
    const groceryList = await generateGroceryList(request, mealPlan);
    
    // Step 5: Create summary and finalize plan
    if (progressCallback) {
      await progressCallback(
        updateProgressWithData(
          createProgressUpdate(user.id, 5, 'Finalizing your plan...'), 
          { nutritionData, workoutPlan, mealPlan, groceryList }
        )
      );
    }
    
    const summary = createPlanSummary(request, nutritionData, workoutPlan, mealPlan, groceryList);
    
    const result: PlanGenerationResult = {
      nutritionData,
      workoutPlan,
      mealPlan,
      groceryList,
      summary
    };
    
    // Step 6: Complete!
    if (progressCallback) {
      await progressCallback(
        updateProgressWithData(
          createProgressUpdate(user.id, 6, 'Plan generated successfully!'), 
          result
        )
      );
    }
    
    console.log(`[PlanGenerator] Completed plan generation for user ${user.id}`);
    return result;
  } catch (error: any) {
    console.error(`[PlanGenerator] Error in plan generation:`, error);
    
    // Update progress with error
    if (progressCallback) {
      const errorProgress: PlanGenerationProgressUpdate = {
        userId: user.id,
        isGenerating: false,
        startedAt: new Date(),
        updatedAt: new Date(),
        currentStep: 0,
        totalSteps: 6,
        stepMessage: `Error: ${error.message}`,
        estimatedTimeRemaining: 0,
        errorMessage: error.message,
        retryCount: 0,
        dataJson: JSON.stringify({ error: error.message })
      };
      
      await progressCallback(errorProgress);
    }
    
    throw error;
  }
}