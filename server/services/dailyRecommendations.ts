import OpenAI from "openai";
import { db } from "../db";
import { meals, workouts, exercises, users, nutritionGoals } from "../../shared/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { format, subDays } from "date-fns";

// Initialize the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define the recommendation response structure
export interface DailyRecommendations {
  workoutRecommendations: {
    suggestedWorkouts: Array<{
      name: string;
      muscleGroups: string[];
      exercises: Array<{
        name: string;
        sets: number;
        reps: number;
        restSeconds?: number;
      }>;
      notes?: string;
    }>;
    recoveryNeeds?: string;
    focusAreas?: string[];
  };
  nutritionRecommendations: {
    dailyMeals: {
      breakfast: {
        name: string;
        description: string;
        nutritionInfo?: {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
      };
      lunch: {
        name: string;
        description: string;
        nutritionInfo?: {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
      };
      dinner: {
        name: string;
        description: string;
        nutritionInfo?: {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
      };
      snacks: Array<{
        name: string;
        description: string;
        nutritionInfo?: {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
      }>;
    };
    waterIntake: number; // in ml
    tips: string[];
    macroGoals?: {
      protein: number;
      carbs: number;
      fat: number;
    };
  };
  overallTips: string[];
  progressInsights?: string;
}

/**
 * Get a user's recent activity data to feed into the AI recommendation system
 */
async function getUserRecentActivity(userId: number) {
  // Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get yesterday's date
  const yesterday = subDays(today, 1);
  const yesterdayFormatted = format(yesterday, 'yyyy-MM-dd');
  
  // Get the past week for analysis
  const pastWeekStart = subDays(today, 7);
  
  // Get user profile data - all user data is stored in the users table
  const userProfile = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .then(results => results[0]);
  
  // Get nutrition goals
  const nutritionGoal = await db.select()
    .from(nutritionGoals)
    .where(eq(nutritionGoals.userId, userId))
    .then(results => results[0]);
  
  // Get yesterday's meals
  const yesterdayMeals = await db.select()
    .from(meals)
    .where(
      and(
        eq(meals.userId, userId),
        sql`${meals.date}::text = ${yesterdayFormatted}`
      )
    );
  
  // Get yesterday's workouts
  const yesterdayWorkouts = await db.select()
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        sql`${workouts.date}::text = ${yesterdayFormatted}`
      )
    );
  
  // Get exercises from yesterday's workouts
  const yesterdayExercises = [];
  for (const workout of yesterdayWorkouts) {
    const exerciseList = await db.select()
      .from(exercises)
      .where(eq(exercises.workoutId, workout.id));
    
    yesterdayExercises.push(...exerciseList);
  }
  
  // Get past week workouts to analyze trends and muscle groups
  const pastWeekWorkouts = await db.select()
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        sql`${workouts.date}::text >= ${format(pastWeekStart, 'yyyy-MM-dd')}`,
        sql`${workouts.date}::text <= ${format(today, 'yyyy-MM-dd')}`
      )
    );
  
  // Collect all exercises from past week workouts
  const pastWeekExercises = [];
  for (const workout of pastWeekWorkouts) {
    const exerciseList = await db.select()
      .from(exercises)
      .where(eq(exercises.workoutId, workout.id));
    
    pastWeekExercises.push(...exerciseList);
  }
  
  // Collect past week meals
  const pastWeekMeals = await db.select()
    .from(meals)
    .where(
      and(
        eq(meals.userId, userId),
        sql`${meals.date}::text >= ${format(pastWeekStart, 'yyyy-MM-dd')}`,
        sql`${meals.date}::text <= ${format(today, 'yyyy-MM-dd')}`
      )
    );
  
  return {
    userProfile,
    nutritionGoal,
    yesterdayMeals,
    yesterdayWorkouts,
    yesterdayExercises,
    pastWeekWorkouts,
    pastWeekExercises,
    pastWeekMeals
  };
}

/**
 * Analyze muscle groups worked in recent workouts to identify gaps
 */
function analyzeMuscleGroups(exercises: any[]) {
  const muscleGroups: Record<string, number> = {
    chest: 0,
    back: 0,
    legs: 0,
    shoulders: 0,
    arms: 0,
    core: 0,
    cardio: 0
  };
  
  // This is a simplified mapping - in a real app you'd have a more comprehensive exercise database
  const exerciseMuscleMap: Record<string, string[]> = {
    // Chest
    "bench press": ["chest", "arms"],
    "push up": ["chest", "arms", "core"],
    "chest fly": ["chest"],
    "dumbbell press": ["chest", "arms"],
    
    // Back
    "pull up": ["back", "arms"],
    "row": ["back"],
    "lat pulldown": ["back", "arms"],
    "deadlift": ["back", "legs"],
    
    // Legs
    "squat": ["legs"],
    "lunge": ["legs"],
    "leg press": ["legs"],
    "leg extension": ["legs"],
    "leg curl": ["legs"],
    
    // Shoulders
    "shoulder press": ["shoulders", "arms"],
    "lateral raise": ["shoulders"],
    "front raise": ["shoulders"],
    
    // Arms
    "bicep curl": ["arms"],
    "tricep extension": ["arms"],
    
    // Core
    "crunch": ["core"],
    "plank": ["core"],
    "sit up": ["core"],
    
    // Cardio
    "run": ["cardio"],
    "jog": ["cardio"],
    "sprint": ["cardio"],
    "cycling": ["cardio"],
    "elliptical": ["cardio"]
  };
  
  // Count exercises by muscle group
  for (const exercise of exercises) {
    const exerciseName = exercise.name.toLowerCase();
    
    // Try to find exact match
    if (exerciseMuscleMap[exerciseName]) {
      for (const muscle of exerciseMuscleMap[exerciseName]) {
        muscleGroups[muscle]++;
      }
      continue;
    }
    
    // Try to find partial match
    for (const [key, muscles] of Object.entries(exerciseMuscleMap)) {
      if (exerciseName.includes(key)) {
        for (const muscle of muscles) {
          muscleGroups[muscle]++;
        }
        break;
      }
    }
  }
  
  return muscleGroups;
}

/**
 * Generate daily AI recommendations for workouts and nutrition
 */
export async function generateDailyRecommendations(userId: number): Promise<DailyRecommendations> {
  try {
    // Fetch user data
    const userData = await getUserRecentActivity(userId);
    
    // Analyze muscle groups to identify potential focus areas
    const workedMuscleGroups = analyzeMuscleGroups(userData.pastWeekExercises);
    
    // Create a profile summary for the AI
    const profile = userData.userProfile;
    
    const profileSummary = {
      gender: profile?.gender || 'unknown',
      age: profile?.age || 'unknown',
      height: profile?.height || 'unknown',
      weight: profile?.weight || 'unknown',
      fitnessGoal: profile?.fitnessGoal || 'overall fitness',
      fitnessLevel: profile?.fitnessLevel || 'intermediate',
      activityLevel: profile?.activityLevel || 'moderate',
      workoutDaysPerWeek: profile?.workoutDaysPerWeek || 3,
      dietaryRestrictions: profile?.dietaryRestrictions || [],
      bodyType: profile?.bodyType || 'unknown'
    };
    
    // Calculate calorie and macro target summaries
    const calorieTarget = userData.nutritionGoal?.caloriesTarget || 2000;
    const proteinTarget = userData.nutritionGoal?.proteinTarget || 100;
    const carbsTarget = userData.nutritionGoal?.carbsTarget || 200;
    const fatTarget = userData.nutritionGoal?.fatTarget || 70;
    
    // Calculate yesterday's nutrition totals
    const yesterdayNutrition = userData.yesterdayMeals.reduce(
      (acc, meal) => {
        acc.calories += meal.calories || 0;
        acc.protein += meal.protein || 0;
        acc.carbs += meal.carbs || 0;
        acc.fat += meal.fat || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    
    // Calculate the number of calories needed to meet goal
    const calorieDeficit = calorieTarget - yesterdayNutrition.calories;
    
    // Generate a summary of yesterday's workouts
    const yesterdayWorkoutSummary = userData.yesterdayWorkouts.map(workout => {
      const workoutExercises = userData.yesterdayExercises.filter(
        ex => ex.workoutId === workout.id
      );
      
      return {
        name: workout.name,
        exercises: workoutExercises.map(ex => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight
        }))
      };
    });
    
    // Define which muscle groups have been underworked recently
    const underworkedMuscles = Object.entries(workedMuscleGroups)
      .filter(([_, count]) => count < 2)
      .map(([muscle]) => muscle);
    
    // Generate system message for the AI
    const systemMessage = `
You are a professional fitness coach and nutritionist providing personalized daily recommendations based on a user's profile, recent activity, and goals.
Your recommendations should be realistic, actionable, and tailored to the user's specific needs and preferences.

Follow these guidelines:
1. Recommend workouts that complement what the user has done recently, focusing on underworked muscle groups.
2. Suggest realistic, balanced meals that align with the user's calorie and macro goals. 
3. Provide specific recipes with brief descriptions rather than vague recommendations.
4. Consider the user's fitness level, dietary restrictions, and preferences.
5. Avoid overly complex workouts for beginners.
6. Recommend recipes with common, accessible ingredients.
7. Provide 2-3 actionable tips for overall improvement.

Your response MUST be formatted as valid JSON with these exact fields:
{
  "workoutRecommendations": {
    "suggestedWorkouts": [
      {
        "name": "string",
        "muscleGroups": ["string"],
        "exercises": [
          {
            "name": "string",
            "sets": number,
            "reps": number,
            "restSeconds": number
          }
        ],
        "notes": "string"
      }
    ],
    "recoveryNeeds": "string",
    "focusAreas": ["string"]
  },
  "nutritionRecommendations": {
    "dailyMeals": {
      "breakfast": {
        "name": "string",
        "description": "string",
        "nutritionInfo": {
          "calories": number,
          "protein": number,
          "carbs": number,
          "fat": number
        }
      },
      "lunch": {
        "name": "string",
        "description": "string",
        "nutritionInfo": {
          "calories": number,
          "protein": number,
          "carbs": number,
          "fat": number
        }
      },
      "dinner": {
        "name": "string",
        "description": "string",
        "nutritionInfo": {
          "calories": number,
          "protein": number,
          "carbs": number,
          "fat": number
        }
      },
      "snacks": [
        {
          "name": "string",
          "description": "string",
          "nutritionInfo": {
            "calories": number,
            "protein": number,
            "carbs": number,
            "fat": number
          }
        }
      ]
    },
    "waterIntake": number,
    "tips": ["string"],
    "macroGoals": {
      "protein": number,
      "carbs": number,
      "fat": number
    }
  },
  "overallTips": ["string"],
  "progressInsights": "string"
}
`;

    // User message with data for the AI to use
    const userMessage = `
Generate personalized fitness and nutrition recommendations for today based on the following user data and yesterday's activity:

USER PROFILE:
- Gender: ${profileSummary.gender}
- Age: ${profileSummary.age}
- Height: ${profileSummary.height}
- Weight: ${profileSummary.weight}
- Fitness Goal: ${profileSummary.fitnessGoal}
- Fitness Level: ${profileSummary.fitnessLevel}
- Activity Level: ${profileSummary.activityLevel}
- Preferred workout days per week: ${profileSummary.workoutDaysPerWeek}
- Dietary Restrictions: ${Array.isArray(profileSummary.dietaryRestrictions) ? profileSummary.dietaryRestrictions.join(', ') : 'None'}
- Body Type: ${profileSummary.bodyType}

NUTRITION GOALS:
- Daily Calorie Target: ${calorieTarget} calories
- Daily Protein Target: ${proteinTarget}g
- Daily Carbs Target: ${carbsTarget}g
- Daily Fat Target: ${fatTarget}g

YESTERDAY'S NUTRITION:
- Total Calories: ${yesterdayNutrition.calories} calories
- Total Protein: ${yesterdayNutrition.protein}g
- Total Carbs: ${yesterdayNutrition.carbs}g
- Total Fat: ${yesterdayNutrition.fat}g
- Calorie Surplus/Deficit: ${calorieDeficit > 0 ? `-${calorieDeficit}` : `+${Math.abs(calorieDeficit)}`} calories

YESTERDAY'S WORKOUTS:
${
  yesterdayWorkoutSummary.length > 0
    ? yesterdayWorkoutSummary.map(workout => 
        `- ${workout.name}: ${workout.exercises.map(ex => 
          `${ex.name} (${ex.sets} sets x ${ex.reps} reps${ex.weight ? ` at ${ex.weight}kg` : ''})`
        ).join(', ')}`
      ).join('\n')
    : '- No workouts completed yesterday'
}

RECENT WORKOUT ANALYSIS:
- Underworked muscle groups: ${underworkedMuscles.join(', ') || 'None - training has been balanced'}

Based on this information, provide today's personalized workout and nutrition recommendations.
`;
    
    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse JSON response - non-null assertion for TypeScript
    const content = response.choices[0].message.content!;
    const recommendations = JSON.parse(content);
    
    console.log('Generated AI recommendations successfully');
    return recommendations as DailyRecommendations;
    
  } catch (error) {
    console.error('Error generating daily recommendations:', error);
    
    // Provide fallback recommendations
    return {
      workoutRecommendations: {
        suggestedWorkouts: [
          {
            name: "Full Body Workout",
            muscleGroups: ["full body"],
            exercises: [
              { name: "Squats", sets: 3, reps: 10 },
              { name: "Push-ups", sets: 3, reps: 10 },
              { name: "Rows", sets: 3, reps: 10 }
            ]
          }
        ],
        focusAreas: ["full body"]
      },
      nutritionRecommendations: {
        dailyMeals: {
          breakfast: {
            name: "Oatmeal with Protein",
            description: "Bowl of oatmeal with protein powder, berries, and nuts"
          },
          lunch: {
            name: "Chicken Salad",
            description: "Grilled chicken with mixed greens, vegetables, and light dressing"
          },
          dinner: {
            name: "Salmon with Vegetables",
            description: "Baked salmon with roasted vegetables and quinoa"
          },
          snacks: [
            {
              name: "Greek Yogurt",
              description: "Greek yogurt with honey and fruit"
            }
          ]
        },
        waterIntake: 2500,
        tips: ["Stay hydrated", "Focus on protein intake", "Eat plenty of vegetables"]
      },
      overallTips: ["Get enough sleep", "Stay consistent with your workouts", "Track your progress"]
    };
  }
}

/**
 * Check if recommendations should be shown to a user today
 */
export async function shouldShowRecommendations(userId: number): Promise<boolean> {
  try {
    // Get the last time recommendations were shown from the database
    // This would typically be stored in a user preferences or settings table
    
    // For this implementation, we'll show recommendations every day
    // In a production environment, you might want to check a lastRecommendationDate field
    
    return true;
  } catch (error) {
    console.error('Error checking if recommendations should be shown:', error);
    return false;
  }
}