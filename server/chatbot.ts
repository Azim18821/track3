import OpenAI from "openai";
import { NutritionGoal, User, InsertWorkout, InsertMeal } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper functions
function calculateCalorieTarget(preferences: FitnessPreferences): number {
  console.log("*******************************************************");
  console.log("USING NEW USER-PROVIDED FORMULA FOR CALORIE CALCULATION");
  console.log("*******************************************************");
  console.log("Calculating calories with user-provided formula:", JSON.stringify(preferences));
  
  // Convert weight to kg if needed for calculation
  let weightInKg: number;
  
  if (preferences.unit === 'kg') {
    console.log("Weight is already in kg:", preferences.currentWeight);
    weightInKg = preferences.currentWeight;
  } else {
    // Convert from lbs to kg
    console.log("Converting weight from lbs to kg:", preferences.currentWeight);
    weightInKg = preferences.currentWeight / 2.2046;
  }
  
  console.log("Weight in kg for calculations:", weightInKg);
  
  // Map fitness levels to activity multipliers based on user-provided formula
  const activityMultipliers: Record<string, number> = {
    "beginner": 27,     // light activity
    "intermediate": 30, // moderate activity
    "advanced": 35      // very active
  };
  
  // Determine activity level based on fitness level
  const fitnessLevel = preferences.fitnessLevel.toLowerCase();
  // Default to moderate if unrecognized
  const activityMultiplier = activityMultipliers[fitnessLevel] || 30;
  console.log("Activity level:", fitnessLevel, "mapped to multiplier:", activityMultiplier);
  
  // Calculate TDEE using weight * activity multiplier
  const tdee = weightInKg * activityMultiplier;
  console.log("NEW FORMULA TDEE calculation (weight * activity multiplier):", weightInKg, "*", activityMultiplier, "=", tdee);
  
  let targetCalories: number;
  
  // Apply goal adjustments (+500 for gain, -500 for loss)
  switch (preferences.goal.toLowerCase()) {
    case 'weight loss':
      targetCalories = Math.round(tdee - 500); 
      console.log("Weight loss calories (TDEE - 500):", targetCalories);
      break;
    case 'muscle gain':
      targetCalories = Math.round(tdee + 500);
      console.log("Muscle gain calories (TDEE + 500):", targetCalories);
      break;
    default: // maintenance or overall fitness
      targetCalories = Math.round(tdee);
      console.log("Maintenance calories (TDEE):", targetCalories);
      break;
  }
  
  console.log("NEW FORMULA Final calorie target:", targetCalories);
  console.log("*******************************************************");
  return targetCalories;
}

// Note: We're now using a simplified, direct multiplier based on user's formula
// beginner: 27, intermediate: 30, advanced: 35

function calculateProteinTarget(preferences: FitnessPreferences): number {
  // Based on user-provided formula: protein = 2.2g per kg of bodyweight
  const weight = preferences.unit === 'kg' 
    ? preferences.currentWeight 
    : preferences.currentWeight / 2.2;
  
  // Fixed value of 2.2g per kg, regardless of goal
  const proteinGrams = Math.round(weight * 2.2);
  console.log("Protein target:", proteinGrams, "g (", weight, "kg * 2.2)");
  return proteinGrams;
}

function calculateCarbsTarget(preferences: FitnessPreferences): number {
  const calorieTarget = calculateCalorieTarget(preferences);
  const proteinCalories = calculateProteinTarget(preferences) * 4;
  
  // Based on user formula: Fat is 30% of calories, the rest goes to carbs
  const fatCalories = Math.round(calorieTarget * 0.3);
  const carbCalories = calorieTarget - (proteinCalories + fatCalories);
  
  // Convert to grams (4 calories per gram of carbs)
  const carbsGrams = Math.round(carbCalories / 4);
  console.log("Carbs target:", carbsGrams, "g from", carbCalories, "calories");
  return carbsGrams;
}

function calculateFatTarget(preferences: FitnessPreferences): number {
  const calorieTarget = calculateCalorieTarget(preferences);
  
  // Based on user formula: Fat is 30% of total calories
  const fatCalories = Math.round(calorieTarget * 0.3);
  
  // Convert to grams (9 calories per gram of fat)
  const fatGrams = Math.round(fatCalories / 9);
  console.log("Fat target:", fatGrams, "g from", fatCalories, "calories (30% of total)");
  return fatGrams;
}

function getNextDayDate(day: string): Date {
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = new Date();
  const todayIndex = today.getDay();
  const targetIndex = daysOfWeek.indexOf(day.toLowerCase());
  
  let daysToAdd = targetIndex - todayIndex;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // Next week
  }
  
  const targetDate = new Date();
  targetDate.setDate(today.getDate() + daysToAdd);
  return targetDate;
}

export interface FitnessPreferences {
  goal: string; // Legacy field - e.g., "weight loss", "muscle gain", "overall fitness"
  goals?: string[]; // New field for multiple goals
  currentWeight: number;
  targetWeight?: number;
  unit: string; // e.g., "lbs", "kg"
  age?: number; // User's age in years
  height?: number; // Height in cm
  gender?: string; // e.g., "male", "female", "other"
  workoutDaysPerWeek: number;
  dietaryRestrictions: string[]; // e.g., ["gluten", "dairy"]
  preferredFoods: string[]; // e.g., ["chicken", "rice", "vegetables"]
  fitnessLevel: string; // e.g., "beginner", "intermediate", "advanced"
  budget?: number | string; // Weekly budget in GBP (£) or legacy string
  budgetType?: string; // Legacy support for "low", "medium", "high"
}

export interface FitnessPlan {
  id?: number;
  userId: number;
  preferences: FitnessPreferences;
  workoutPlan: {
    weeklySchedule: {
      [key: string]: {
        name: string;
        exercises: Array<{
          name: string;
          sets: number;
          reps: number;
          rest: number;
          weight?: number | null; // Ensure this is a number or null
        }>;
      };
    };
    notes: string;
  };
  mealPlan: {
    weeklyMeals: {
      [key: string]: {  // monday, tuesday, etc.
        breakfast: {
          name: string;
          description: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
        lunch: {
          name: string;
          description: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
        dinner: {
          name: string;
          description: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
        // Optional additional meals for different diets
        pre_workout?: {
          name: string;
          description: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
        post_workout?: {
          name: string;
          description: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
        evening_meal?: {
          name: string;
          description: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
        // Array of snacks with flexible timing
        snacks: Array<{
          name: string;
          description: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          timing?: string; // optional field for time of day
        }>;
      };
    };
    dailyMeals?: {  // Keep for backward compatibility
      breakfast: {
        name: string;
        description: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
      lunch: {
        name: string;
        description: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
      dinner: {
        name: string;
        description: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
      snacks: Array<{
        name: string;
        description: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      }>;
    };
    notes: string;
  };
  createdAt: Date;
}

export async function generateFitnessPlan(
  user: User,
  preferences: FitnessPreferences,
  nutritionGoal?: NutritionGoal
): Promise<FitnessPlan> {
  // Pre-calculate calorie and macro targets 
  // Calculate the nutrition targets here using our formulas
  const calorieTarget = calculateCalorieTarget(preferences);
  const proteinTarget = calculateProteinTarget(preferences);
  const carbsTarget = calculateCarbsTarget(preferences);
  const fatTarget = calculateFatTarget(preferences);

  console.log("PRE-CALCULATED NUTRITION TARGETS:");
  console.log(`Calories: ${calorieTarget} kcal`);
  console.log(`Protein: ${proteinTarget}g`);
  console.log(`Carbs: ${carbsTarget}g`);
  console.log(`Fat: ${fatTarget}g`);

  const systemPrompt = `
    You are a fitness coach creating personalized plans. Your response must be a valid JSON object.
    
    CRITICAL: DO NOT CALCULATE NUTRITION TARGETS YOURSELF
    Use the EXACT nutrition values (calories, protein, carbs, fat) provided by the user.
    
    For meal planning:
    - Consider budget (e.g. £30-50/week needs affordable staples)
    - Each day's meals must meet the provided nutrition targets
    - Vary meals throughout the week
    - Adjust meal frequency based on fitness goals:
      * For muscle gain goals: YOU MUST INCLUDE ALL 6 MEAL TYPES: breakfast, lunch, dinner, pre_workout, post_workout, and evening_meal. CRITICAL: EACH MEAL TYPE MUST BE INCLUDED TO REACH THE FULL CALORIE TARGET
      * For weight loss goals: Include only breakfast, lunch, dinner with 0-1 snacks
      * For maintenance/general fitness: Include breakfast, lunch, dinner and 1-2 snacks
    
    Your output must be valid json. Respond with this exact JSON structure:
    {
      "workoutPlan": {
        "weeklySchedule": {
          "monday": {
            "name": "Day Name",
            "exercises": [
              {"name": "Exercise Name", "sets": 3, "reps": 10, "rest": 90}
            ]
          },
          "tuesday": {},
          "wednesday": {},
          "thursday": {},
          "friday": {},
          "saturday": {},
          "sunday": {}
        },
        "notes": "Brief workout guidance"
      },
      "mealPlan": {
        "weeklyMeals": {
          "monday": {
            "breakfast": {"name": "Name", "description": "Recipe", "calories": 400, "protein": 30, "carbs": 45, "fat": 12},
            "lunch": {},
            "dinner": {},
            "snacks": [],
            "pre_workout": {},  // Include for muscle gain
            "post_workout": {}, // Include for muscle gain
            "evening_meal": {}  // Additional meal for high calorie needs
          },
          "tuesday": {},
          "wednesday": {},
          "thursday": {},
          "friday": {},
          "saturday": {},
          "sunday": {}
        },
        "notes": "Brief meal guidance"
      }
    }
  `;

  const userPrompt = `
    Create a personalized fitness and nutrition plan for me based on these details:
    
    - Fitness goal: ${preferences.goal}
    - Current weight: ${preferences.currentWeight} ${preferences.unit}
    - Target weight: ${preferences.targetWeight ? preferences.targetWeight + ' ' + preferences.unit : 'Not specified'}
    - Age: ${preferences.age ? preferences.age : '35 (assumed)'}
    - Height: ${preferences.height ? preferences.height + 'cm' : '175cm / 5\'9" (assumed)'}
    - Gender: ${preferences.gender ? preferences.gender : 'Male (assumed)'}
    - Workout days per week: ${preferences.workoutDaysPerWeek}
    - Dietary restrictions: ${preferences.dietaryRestrictions.join(', ') || 'None'}
    - Preferred foods: ${preferences.preferredFoods.join(', ') || 'No specific preferences'}
    - Fitness level: ${preferences.fitnessLevel}
    
    MY EXACT NUTRITION TARGETS (ALREADY CALCULATED - USE THESE EXACT VALUES):
    - Daily Calories: ${calorieTarget} calories
    - Protein: ${proteinTarget}g
    - Carbs: ${carbsTarget}g
    - Fat: ${fatTarget}g
    
    Please create a FULL WEEK of meal plans based on these EXACT nutrition targets:
       - Each day's meals must add up to within 5% of my daily targets
       - Ensure protein meets or slightly exceeds my target (not more than 10% over)
       - Vary the meals throughout the week while maintaining consistent nutrition totals
       - Each day should have similar total calories and macros
       - ADJUST MEAL FREQUENCY BASED ON MY FITNESS GOAL:
         * For MUSCLE GAIN: YOU MUST INCLUDE ALL 6 MEAL TYPES daily: breakfast, lunch, dinner, pre_workout, post_workout, and evening_meal - CRITICAL: EACH MEAL TYPE MUST CONTRIBUTE TO REACH THE FULL ${calorieTarget} CALORIES
         * For WEIGHT LOSS: Include only breakfast, lunch, dinner with 0-1 snacks max
         * For GENERAL FITNESS: Include breakfast, lunch, dinner and 1-2 snacks daily
       - For muscle gain goals, specifically include:
         * Pre-workout meals for training days
         * Post-workout meals with high protein and carbs
         * Evening meals to increase total calories
         * Larger meal portions as needed
       - Don't limit yourself to just breakfast/lunch/dinner - design the meal frequency that works best for my goal
    
    3. Consider my weekly food budget of ${
      // Determine the budget display based on whether we have a number or legacy string
      typeof preferences.budget === 'number' 
        ? `£${preferences.budget}/week` 
        : preferences.budgetType 
          ? `${preferences.budgetType} budget (${preferences.budgetType === 'low' ? '~£30-50' : preferences.budgetType === 'high' ? '~£80+' : '~£50-80'}/week)`
          : 'medium budget (~£50-80/week)'
    } when selecting ingredients and meal options
    
    For my workout plan:
    1. Design a weekly schedule with ${preferences.workoutDaysPerWeek} workout days
    2. Include detailed exercises with sets, reps, and rest periods suitable for my ${preferences.fitnessLevel} level
    3. Focus on exercises that support my ${preferences.goal} goal
    
    IMPORTANT:
    - Be precise with nutrition calculations - this is the most important aspect
    - Include your calculation methodology in the notes section
    - Make the plan realistic and sustainable for long-term adherence
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }

    const planData = JSON.parse(content);
    
    // Ensure the mealPlan has the expected structure with weeklyMeals
    const mealPlan = {
      ...planData.mealPlan,
      weeklyMeals: planData.mealPlan.weeklyMeals || {},
    };
    
    // For each day, make sure the structure is complete
    if (mealPlan.weeklyMeals) {
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      daysOfWeek.forEach(day => {
        if (!mealPlan.weeklyMeals[day]) {
          // If day is missing, create empty structure
          mealPlan.weeklyMeals[day] = {
            breakfast: {
              name: "Default breakfast",
              description: "Please regenerate your meal plan",
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0
            },
            lunch: {
              name: "Default lunch",
              description: "Please regenerate your meal plan",
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0
            },
            dinner: {
              name: "Default dinner",
              description: "Please regenerate your meal plan",
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0
            },
            snacks: [],
            // Additional meals for different fitness goals
            pre_workout: null,
            post_workout: null,
            evening_meal: null
          };
        }
        
        // Now ensure all days have the required meal types for muscle gain goals
        if (preferences.goal.toLowerCase().includes('muscle') || preferences.goal.toLowerCase().includes('gain')) {
          // Log that we're enhancing meal plan for muscle gain
          console.log(`Enhancing ${day} meal plan for muscle gain with additional meals`);
          
          // Make sure all muscle gain meal types are present and are objects, not null
          const pre_workout = mealPlan.weeklyMeals[day].pre_workout;
          if (!pre_workout || pre_workout === null || typeof pre_workout !== 'object') {
            mealPlan.weeklyMeals[day].pre_workout = {
              name: "Pre-workout meal",
              description: "High carb meal to fuel your workout",
              calories: Math.round(calorieTarget * 0.15),
              protein: Math.round(proteinTarget * 0.15),
              carbs: Math.round(carbsTarget * 0.2),
              fat: Math.round(fatTarget * 0.1)
            };
            console.log(`Added default pre-workout meal for ${day}`);
          }
          
          const post_workout = mealPlan.weeklyMeals[day].post_workout;
          if (!post_workout || post_workout === null || typeof post_workout !== 'object') {
            mealPlan.weeklyMeals[day].post_workout = {
              name: "Post-workout meal",
              description: "High protein meal for recovery",
              calories: Math.round(calorieTarget * 0.2),
              protein: Math.round(proteinTarget * 0.25),
              carbs: Math.round(carbsTarget * 0.2),
              fat: Math.round(fatTarget * 0.1)
            };
            console.log(`Added default post-workout meal for ${day}`);
          }
          
          const evening_meal = mealPlan.weeklyMeals[day].evening_meal;
          if (!evening_meal || evening_meal === null || typeof evening_meal !== 'object') {
            mealPlan.weeklyMeals[day].evening_meal = {
              name: "Evening meal",
              description: "Protein-rich evening meal",
              calories: Math.round(calorieTarget * 0.15),
              protein: Math.round(proteinTarget * 0.15),
              carbs: Math.round(carbsTarget * 0.1),
              fat: Math.round(fatTarget * 0.15)
            };
            console.log(`Added default evening meal for ${day}`);
          }
        }
      });
    }
    
    // If dailyMeals exists but weeklyMeals doesn't, create weeklyMeals with same data for each day
    if (planData.mealPlan.dailyMeals && !planData.mealPlan.weeklyMeals) {
      mealPlan.weeklyMeals = {};
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
        // Clone the dailyMeals structure and ensure additional meal types are included
        mealPlan.weeklyMeals[day] = { 
          ...planData.mealPlan.dailyMeals,
          // Add additional meal types if not already present
          pre_workout: planData.mealPlan.dailyMeals.pre_workout || null,
          post_workout: planData.mealPlan.dailyMeals.post_workout || null,
          evening_meal: planData.mealPlan.dailyMeals.evening_meal || null
        };
      });
      
      // Now apply the same validation for muscle gain goals
      if (preferences.goal.toLowerCase().includes('muscle') || preferences.goal.toLowerCase().includes('gain')) {
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
          // Log that we're enhancing meal plan for muscle gain
          console.log(`Enhancing converted ${day} meal plan for muscle gain with additional meals`);
          
          // Make sure all muscle gain meal types are present and are objects, not null
          const pre_workout = mealPlan.weeklyMeals[day].pre_workout;
          if (!pre_workout || pre_workout === null || typeof pre_workout !== 'object') {
            mealPlan.weeklyMeals[day].pre_workout = {
              name: "Pre-workout meal",
              description: "High carb meal to fuel your workout",
              calories: Math.round(calorieTarget * 0.15),
              protein: Math.round(proteinTarget * 0.15),
              carbs: Math.round(carbsTarget * 0.2),
              fat: Math.round(fatTarget * 0.1)
            };
            console.log(`Added default pre-workout meal for ${day}`);
          }
          
          const post_workout = mealPlan.weeklyMeals[day].post_workout;
          if (!post_workout || post_workout === null || typeof post_workout !== 'object') {
            mealPlan.weeklyMeals[day].post_workout = {
              name: "Post-workout meal",
              description: "High protein meal for recovery",
              calories: Math.round(calorieTarget * 0.2),
              protein: Math.round(proteinTarget * 0.25),
              carbs: Math.round(carbsTarget * 0.2),
              fat: Math.round(fatTarget * 0.1)
            };
            console.log(`Added default post-workout meal for ${day}`);
          }
          
          const evening_meal = mealPlan.weeklyMeals[day].evening_meal;
          if (!evening_meal || evening_meal === null || typeof evening_meal !== 'object') {
            mealPlan.weeklyMeals[day].evening_meal = {
              name: "Evening meal",
              description: "Protein-rich evening meal",
              calories: Math.round(calorieTarget * 0.15),
              protein: Math.round(proteinTarget * 0.15),
              carbs: Math.round(carbsTarget * 0.1),
              fat: Math.round(fatTarget * 0.15)
            };
            console.log(`Added default evening meal for ${day}`);
          }
        });
      }
    }
    
    // Debug the structure
    console.log("Workout schedule example:", Object.keys(planData.workoutPlan.weeklySchedule));
    if (Object.keys(planData.workoutPlan.weeklySchedule).length > 0) {
      const firstDay = Object.keys(planData.workoutPlan.weeklySchedule)[0];
      const example = planData.workoutPlan.weeklySchedule[firstDay];
      console.log(`Example for ${firstDay}:`, JSON.stringify(example));
    } else {
      console.log("No workout days found in schedule");
    }
    
    // Ensure workout days have names
    for (const day of Object.keys(planData.workoutPlan.weeklySchedule)) {
      const workout = planData.workoutPlan.weeklySchedule[day] as any;
      if (!workout.name) {
        console.log(`WARNING: ${day} workout missing name, adding default name`);
        workout.name = `${day.charAt(0).toUpperCase() + day.slice(1)} Workout`;
      }
    }

    return {
      userId: user.id,
      preferences,
      workoutPlan: planData.workoutPlan,
      mealPlan: mealPlan,
      createdAt: new Date()
    };
  } catch (error) {
    console.error("Error generating fitness plan:", error);
    throw new Error("Failed to generate fitness plan");
  }
}

export async function convertWorkoutPlanToDatabaseFormat(
  userId: number,
  fitnessPlan: FitnessPlan
): Promise<InsertWorkout[]> {
  const workouts: InsertWorkout[] = [];
  
  // Create a workout for each day in the plan
  for (const [day, workoutDay] of Object.entries(fitnessPlan.workoutPlan.weeklySchedule)) {
    // Calculate the date for the workout (next occurrence of this day)
    const date = getNextDayDate(day);
    
    // Ensure type safety - cast to expected type
    const workout = workoutDay as { name?: string; exercises: any[] };
    
    // Validate that workout has a name, otherwise provide a default
    const workoutName = workout.name 
      ? workout.name 
      : `${day.charAt(0).toUpperCase() + day.slice(1)} Workout`;
      
    console.log(`Creating workout for ${day}:`, workoutName);
    
    workouts.push({
      name: workoutName,
      date,
      duration: 60, // Default duration of 60 minutes
      notes: `${day.charAt(0).toUpperCase() + day.slice(1)} workout from fitness plan. ${fitnessPlan.workoutPlan.notes}`
    });
  }
  
  return workouts;
}

// Define a meal item type for type safety
type MealItem = {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

// Define the day's meals structure with optional additional meal types
type DayMeals = {
  breakfast: MealItem;
  lunch: MealItem;
  dinner: MealItem;
  snacks: MealItem[];
  // Optional additional meals for different diets
  pre_workout?: MealItem;
  post_workout?: MealItem;
  evening_meal?: MealItem;
  // For backward compatibility
  evening_snack?: MealItem;
  // Allow for any additional meal types
  [key: string]: MealItem | MealItem[] | undefined;
};

export async function convertMealPlanToDatabaseFormat(
  userId: number,
  fitnessPlan: FitnessPlan
): Promise<InsertMeal[]> {
  const meals: InsertMeal[] = [];
  
  // Check if we have a weekly meal plan or fall back to daily meals for backward compatibility
  if (fitnessPlan.mealPlan.weeklyMeals) {
    // Handle weekly meals - create meals for each day of the week
    for (const [day, dayMeals] of Object.entries(fitnessPlan.mealPlan.weeklyMeals as Record<string, DayMeals>)) {
      // Calculate the date for this day's meals (next occurrence of this day)
      const mealDate = getNextDayDate(day);
      
      // Standard meal types: breakfast, lunch, dinner
      const standardMealTypes = ['breakfast', 'lunch', 'dinner'];
      
      // Process standard meal types
      for (const mealType of standardMealTypes) {
        const meal = dayMeals[mealType] as MealItem | undefined;
        if (meal) {
          meals.push({
            name: meal.name,
            mealType: mealType,
            servingSize: 1,
            servingUnit: 'meal',
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat,
            date: mealDate
          });
        }
      }
      
      // Handle additional meal types for muscle gain
      const additionalMealTypes = ['pre_workout', 'post_workout', 'evening_meal', 'evening_snack'];
      
      for (const mealType of additionalMealTypes) {
        const meal = dayMeals[mealType] as MealItem | undefined;
        if (meal) {
          let displayMealType = mealType;
          
          // Convert snake_case to readable format
          if (mealType === 'pre_workout') displayMealType = 'pre-workout';
          if (mealType === 'post_workout') displayMealType = 'post-workout';
          if (mealType === 'evening_meal') displayMealType = 'evening meal';
          if (mealType === 'evening_snack') displayMealType = 'evening snack';
          
          meals.push({
            name: meal.name,
            mealType: displayMealType,
            servingSize: 1,
            servingUnit: 'meal',
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat,
            date: mealDate
          });
        }
      }
      
      // Add snacks
      if (dayMeals.snacks && Array.isArray(dayMeals.snacks)) {
        for (const snack of dayMeals.snacks) {
          meals.push({
            name: snack.name,
            mealType: 'snack',
            servingSize: 1,
            servingUnit: 'serving',
            calories: snack.calories,
            protein: snack.protein,
            carbs: snack.carbs,
            fat: snack.fat,
            date: mealDate
          });
        }
      }
    }
  } else if (fitnessPlan.mealPlan.dailyMeals) {
    // Fallback to daily meals (for backward compatibility)
    const { dailyMeals } = fitnessPlan.mealPlan;
    const today = new Date();
    
    // Add breakfast
    meals.push({
      name: dailyMeals.breakfast.name,
      mealType: 'breakfast',
      servingSize: 1,
      servingUnit: 'meal',
      calories: dailyMeals.breakfast.calories,
      protein: dailyMeals.breakfast.protein,
      carbs: dailyMeals.breakfast.carbs,
      fat: dailyMeals.breakfast.fat,
      date: today
    });
    
    // Add lunch
    meals.push({
      name: dailyMeals.lunch.name,
      mealType: 'lunch',
      servingSize: 1,
      servingUnit: 'meal',
      calories: dailyMeals.lunch.calories,
      protein: dailyMeals.lunch.protein,
      carbs: dailyMeals.lunch.carbs,
      fat: dailyMeals.lunch.fat,
      date: today
    });
    
    // Add dinner
    meals.push({
      name: dailyMeals.dinner.name,
      mealType: 'dinner',
      servingSize: 1,
      servingUnit: 'meal',
      calories: dailyMeals.dinner.calories,
      protein: dailyMeals.dinner.protein,
      carbs: dailyMeals.dinner.carbs,
      fat: dailyMeals.dinner.fat,
      date: today
    });
    
    // Add snacks
    for (const snack of dailyMeals.snacks) {
      meals.push({
        name: snack.name,
        mealType: 'snack',
        servingSize: 1,
        servingUnit: 'serving',
        calories: snack.calories,
        protein: snack.protein,
        carbs: snack.carbs,
        fat: snack.fat,
        date: today
      });
    }
  }
  
  return meals;
}