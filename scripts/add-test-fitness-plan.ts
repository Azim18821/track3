/**
 * Script to add a test fitness plan for a client
 * This adds a fitness plan directly to the database for testing purposes
 */

import { db } from '../server/db';
import { trainerFitnessPlans } from '../shared/schema';

async function addTestFitnessPlan() {
  console.log('Adding test fitness plan to the database...');
  
  const trainerId = 71; // Azim8
  const clientId = 68;  // Azim7
  
  try {
    // Create sample workout plan with JSON structure
    const workoutPlan = {
      weeklySchedule: {
        monday: {
          name: "Upper Body Strength",
          exercises: [
            {
              name: "Bench Press",
              sets: 4,
              reps: 8,
              weight: 60,
              unit: "kg",
              rest: "90s"
            },
            {
              name: "Incline Dumbbell Press",
              sets: 3,
              reps: 10,
              weight: 20,
              unit: "kg",
              rest: "60s"
            },
            {
              name: "Tricep Pushdowns",
              sets: 3,
              reps: 12,
              weight: 25,
              unit: "kg",
              rest: "60s"
            }
          ],
          notes: "Focus on form and controlled movements"
        },
        wednesday: {
          name: "Back & Biceps",
          exercises: [
            {
              name: "Deadlift",
              sets: 4,
              reps: 6,
              weight: 100,
              unit: "kg",
              rest: "120s"
            },
            {
              name: "Pull-ups",
              sets: 3,
              reps: 8,
              weight: 0,
              unit: "kg",
              rest: "60s"
            },
            {
              name: "Barbell Curls",
              sets: 3,
              reps: 10,
              weight: 20,
              unit: "kg",
              rest: "60s"
            }
          ],
          notes: "Focus on engaging the back muscles"
        },
        friday: {
          name: "Legs & Shoulders",
          exercises: [
            {
              name: "Squats",
              sets: 4,
              reps: 8,
              weight: 80,
              unit: "kg",
              rest: "90s"
            },
            {
              name: "Leg Press",
              sets: 3,
              reps: 10,
              weight: 120,
              unit: "kg",
              rest: "60s"
            },
            {
              name: "Shoulder Press",
              sets: 3,
              reps: 10,
              weight: 15,
              unit: "kg",
              rest: "60s"
            }
          ],
          notes: "Don't forget to stretch after workout"
        }
      },
      notes: "Progressive overload each week"
    };
    
    // Create sample meal plan with JSON structure
    const mealPlan = {
      dailyMeals: {
        breakfast: {
          name: "Protein Oatmeal",
          description: "Oatmeal with protein powder, banana, and berries",
          calories: 450,
          protein: 30,
          carbs: 60,
          fat: 10
        },
        lunch: {
          name: "Chicken & Rice Bowl",
          description: "Grilled chicken breast with brown rice and vegetables",
          calories: 550,
          protein: 40,
          carbs: 65,
          fat: 12
        },
        dinner: {
          name: "Salmon with Sweet Potato",
          description: "Baked salmon with sweet potato and broccoli",
          calories: 500,
          protein: 35,
          carbs: 45,
          fat: 20
        },
        snacks: [
          {
            name: "Protein Shake",
            description: "Whey protein with milk and banana",
            calories: 300,
            protein: 25,
            carbs: 30,
            fat: 5
          },
          {
            name: "Greek Yogurt with Berries",
            description: "Greek yogurt with mixed berries and honey",
            calories: 200,
            protein: 15,
            carbs: 20,
            fat: 5
          }
        ]
      },
      notes: "Increase protein intake on training days"
    };
    
    // Insert the fitness plan into the database
    const result = await db.insert(trainerFitnessPlans).values({
      trainerId,
      clientId,
      name: "8-Week Strength Builder",
      description: "A comprehensive 8-week plan focused on building strength and muscle mass",
      workoutPlan,
      mealPlan,
      isActive: true,
      notes: "Adjust weights based on performance each week"
    }).returning();
    
    console.log('Successfully added fitness plan:', result);
    return true;
  } catch (error) {
    console.error('Error adding fitness plan:', error);
    return false;
  }
}

async function run() {
  const success = await addTestFitnessPlan();
  
  if (success) {
    console.log('Test fitness plan added successfully.');
  } else {
    console.error('Failed to add test fitness plan.');
    process.exit(1);
  }
  
  process.exit(0);
}

run();