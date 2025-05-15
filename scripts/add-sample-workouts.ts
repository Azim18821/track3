/**
 * Script to add sample workouts for user demos
 * 
 * This script creates realistic workout data for a specified user
 * to demonstrate the workout logging, workout mode, and history features
 */

import { db } from '../server/db';
import { users, workouts, exercises, exerciseSets } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Interface for set data
interface SetData {
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
  notes?: string;
}

async function addSampleWorkoutsForUser(userId: number) {
  console.log(`Adding sample workouts for user ID: ${userId}`);
  
  // Create a series of workouts over the past 30 days
  const workoutData = [
    // Upper body workouts
    {
      name: "Upper Body Strength",
      date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
      duration: 65,
      notes: "Focused on progressive overload for chest and shoulders",
      completed: true,
      exercises: [
        {
          name: "Bench Press",
          sets: 4,
          reps: 8,
          weight: 70,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 8, weight: 70, completed: true } as SetData,
            { setNumber: 2, reps: 8, weight: 70, completed: true } as SetData,
            { setNumber: 3, reps: 7, weight: 70, completed: true } as SetData, 
            { setNumber: 4, reps: 6, weight: 70, completed: true } as SetData
          ]
        },
        {
          name: "Overhead Press",
          sets: 3,
          reps: 10,
          weight: 40,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 10, weight: 40, completed: true },
            { setNumber: 2, reps: 9, weight: 40, completed: true },
            { setNumber: 3, reps: 8, weight: 40, completed: true }
          ]
        },
        {
          name: "Bent Over Rows",
          sets: 3,
          reps: 12,
          weight: 55,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 12, weight: 55, completed: true },
            { setNumber: 2, reps: 12, weight: 55, completed: true },
            { setNumber: 3, reps: 10, weight: 55, completed: true }
          ]
        },
        {
          name: "Tricep Pushdowns",
          sets: 3,
          reps: 15,
          weight: 25,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 15, weight: 25, completed: true },
            { setNumber: 2, reps: 15, weight: 25, completed: true },
            { setNumber: 3, reps: 12, weight: 25, completed: true }
          ]
        }
      ]
    },
    // The next upper body workout with progression
    {
      name: "Upper Body Strength",
      date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
      duration: 70,
      notes: "Increased weight on bench press, feeling stronger",
      completed: true,
      exercises: [
        {
          name: "Bench Press",
          sets: 4,
          reps: 8,
          weight: 72.5,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 8, weight: 72.5, completed: true },
            { setNumber: 2, reps: 8, weight: 72.5, completed: true },
            { setNumber: 3, reps: 8, weight: 72.5, completed: true },
            { setNumber: 4, reps: 7, weight: 72.5, completed: true }
          ]
        },
        {
          name: "Overhead Press",
          sets: 3,
          reps: 10,
          weight: 42.5,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 10, weight: 42.5, completed: true },
            { setNumber: 2, reps: 10, weight: 42.5, completed: true },
            { setNumber: 3, reps: 9, weight: 42.5, completed: true }
          ]
        },
        {
          name: "Bent Over Rows",
          sets: 3,
          reps: 12,
          weight: 57.5,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 12, weight: 57.5, completed: true },
            { setNumber: 2, reps: 12, weight: 57.5, completed: true },
            { setNumber: 3, reps: 12, weight: 57.5, completed: true }
          ]
        },
        {
          name: "Tricep Pushdowns",
          sets: 3,
          reps: 15,
          weight: 27.5,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 15, weight: 27.5, completed: true },
            { setNumber: 2, reps: 15, weight: 27.5, completed: true },
            { setNumber: 3, reps: 15, weight: 27.5, completed: true }
          ]
        }
      ]
    },
    // The latest upper body workout
    {
      name: "Upper Body Strength",
      date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), // 11 days ago
      duration: 75,
      notes: "Great session, hit new PR on bench press!",
      completed: true,
      exercises: [
        {
          name: "Bench Press",
          sets: 4,
          reps: 8,
          weight: 75,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 8, weight: 75, completed: true },
            { setNumber: 2, reps: 8, weight: 75, completed: true },
            { setNumber: 3, reps: 8, weight: 75, completed: true },
            { setNumber: 4, reps: 8, weight: 75, completed: true }
          ]
        },
        {
          name: "Overhead Press",
          sets: 3,
          reps: 10,
          weight: 45,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 10, weight: 45, completed: true },
            { setNumber: 2, reps: 10, weight: 45, completed: true },
            { setNumber: 3, reps: 10, weight: 45, completed: true }
          ]
        },
        {
          name: "Bent Over Rows",
          sets: 3,
          reps: 12,
          weight: 60,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 12, weight: 60, completed: true },
            { setNumber: 2, reps: 12, weight: 60, completed: true },
            { setNumber: 3, reps: 12, weight: 60, completed: true }
          ]
        },
        {
          name: "Tricep Pushdowns",
          sets: 3,
          reps: 15,
          weight: 30,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 15, weight: 30, completed: true },
            { setNumber: 2, reps: 15, weight: 30, completed: true },
            { setNumber: 3, reps: 15, weight: 30, completed: true }
          ]
        },
        {
          name: "Face Pulls",
          sets: 3,
          reps: 15,
          weight: 20,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 15, weight: 20, completed: true },
            { setNumber: 2, reps: 15, weight: 20, completed: true },
            { setNumber: 3, reps: 15, weight: 20, completed: true }
          ]
        }
      ]
    },
    // Lower body workouts
    {
      name: "Lower Body Focus",
      date: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000), // 22 days ago
      duration: 60,
      notes: "First time trying out the new squat routine",
      completed: true,
      exercises: [
        {
          name: "Barbell Squats",
          sets: 5,
          reps: 5,
          weight: 100,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 5, weight: 100, completed: true },
            { setNumber: 2, reps: 5, weight: 100, completed: true },
            { setNumber: 3, reps: 5, weight: 100, completed: true },
            { setNumber: 4, reps: 5, weight: 100, completed: true },
            { setNumber: 5, reps: 4, weight: 100, completed: true }
          ]
        },
        {
          name: "Romanian Deadlifts",
          sets: 3,
          reps: 10,
          weight: 80,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 10, weight: 80, completed: true },
            { setNumber: 2, reps: 10, weight: 80, completed: true },
            { setNumber: 3, reps: 9, weight: 80, completed: true }
          ]
        },
        {
          name: "Leg Press",
          sets: 3,
          reps: 12,
          weight: 150,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 12, weight: 150, completed: true },
            { setNumber: 2, reps: 12, weight: 150, completed: true },
            { setNumber: 3, reps: 10, weight: 150, completed: true }
          ]
        },
        {
          name: "Calf Raises",
          sets: 4,
          reps: 15,
          weight: 60,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 15, weight: 60, completed: true },
            { setNumber: 2, reps: 15, weight: 60, completed: true },
            { setNumber: 3, reps: 15, weight: 60, completed: true },
            { setNumber: 4, reps: 15, weight: 60, completed: true }
          ]
        }
      ]
    },
    // Next lower body workout
    {
      name: "Lower Body Focus",
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      duration: 65,
      notes: "Focusing on form with slightly higher weight",
      completed: true,
      exercises: [
        {
          name: "Barbell Squats",
          sets: 5,
          reps: 5,
          weight: 105,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 5, weight: 105, completed: true },
            { setNumber: 2, reps: 5, weight: 105, completed: true },
            { setNumber: 3, reps: 5, weight: 105, completed: true },
            { setNumber: 4, reps: 5, weight: 105, completed: true },
            { setNumber: 5, reps: 5, weight: 105, completed: true }
          ]
        },
        {
          name: "Romanian Deadlifts",
          sets: 3,
          reps: 10,
          weight: 85,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 10, weight: 85, completed: true },
            { setNumber: 2, reps: 10, weight: 85, completed: true },
            { setNumber: 3, reps: 10, weight: 85, completed: true }
          ]
        },
        {
          name: "Leg Press",
          sets: 3,
          reps: 12,
          weight: 160,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 12, weight: 160, completed: true },
            { setNumber: 2, reps: 12, weight: 160, completed: true },
            { setNumber: 3, reps: 12, weight: 160, completed: true }
          ]
        },
        {
          name: "Calf Raises",
          sets: 4,
          reps: 15,
          weight: 65,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 15, weight: 65, completed: true },
            { setNumber: 2, reps: 15, weight: 65, completed: true },
            { setNumber: 3, reps: 15, weight: 65, completed: true },
            { setNumber: 4, reps: 15, weight: 65, completed: true }
          ]
        }
      ]
    },
    // Most recent lower body workout
    {
      name: "Lower Body Focus",
      date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      duration: 70,
      notes: "Really pushed myself on squats today, feeling great progress",
      completed: true,
      exercises: [
        {
          name: "Barbell Squats",
          sets: 5,
          reps: 5,
          weight: 110,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 5, weight: 110, completed: true },
            { setNumber: 2, reps: 5, weight: 110, completed: true },
            { setNumber: 3, reps: 5, weight: 110, completed: true },
            { setNumber: 4, reps: 5, weight: 110, completed: true },
            { setNumber: 5, reps: 5, weight: 110, completed: true }
          ]
        },
        {
          name: "Romanian Deadlifts",
          sets: 3,
          reps: 10,
          weight: 90,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 10, weight: 90, completed: true },
            { setNumber: 2, reps: 10, weight: 90, completed: true },
            { setNumber: 3, reps: 10, weight: 90, completed: true }
          ]
        },
        {
          name: "Leg Press",
          sets: 3,
          reps: 12,
          weight: 170,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 12, weight: 170, completed: true },
            { setNumber: 2, reps: 12, weight: 170, completed: true },
            { setNumber: 3, reps: 12, weight: 170, completed: true }
          ]
        },
        {
          name: "Calf Raises",
          sets: 4,
          reps: 15,
          weight: 70,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 15, weight: 70, completed: true },
            { setNumber: 2, reps: 15, weight: 70, completed: true },
            { setNumber: 3, reps: 15, weight: 70, completed: true },
            { setNumber: 4, reps: 15, weight: 70, completed: true }
          ]
        },
        {
          name: "Hamstring Curls",
          sets: 3,
          reps: 12,
          weight: 45,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 12, weight: 45, completed: true },
            { setNumber: 2, reps: 12, weight: 45, completed: true },
            { setNumber: 3, reps: 10, weight: 45, completed: true }
          ]
        }
      ]
    },
    // Full body sessions
    {
      name: "Full Body Workout",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      duration: 80,
      notes: "Tried the new full body routine, good variety of exercises",
      completed: true,
      exercises: [
        {
          name: "Deadlifts",
          sets: 3,
          reps: 5,
          weight: 120,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 5, weight: 120, completed: true },
            { setNumber: 2, reps: 5, weight: 120, completed: true },
            { setNumber: 3, reps: 5, weight: 120, completed: true }
          ]
        },
        {
          name: "Incline Bench Press",
          sets: 3,
          reps: 8,
          weight: 65,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 8, weight: 65, completed: true },
            { setNumber: 2, reps: 8, weight: 65, completed: true },
            { setNumber: 3, reps: 7, weight: 65, completed: true }
          ]
        },
        {
          name: "Pull-ups",
          sets: 3,
          reps: 10,
          weight: 0,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 10, weight: 0, completed: true },
            { setNumber: 2, reps: 8, weight: 0, completed: true },
            { setNumber: 3, reps: 7, weight: 0, completed: true }
          ]
        },
        {
          name: "Lunges",
          sets: 3,
          reps: 12,
          weight: 40,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 12, weight: 40, completed: true },
            { setNumber: 2, reps: 12, weight: 40, completed: true },
            { setNumber: 3, reps: 12, weight: 40, completed: true }
          ]
        },
        {
          name: "Lateral Raises",
          sets: 3,
          reps: 15,
          weight: 10,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 15, weight: 10, completed: true },
            { setNumber: 2, reps: 15, weight: 10, completed: true },
            { setNumber: 3, reps: 12, weight: 10, completed: true }
          ]
        },
        {
          name: "Plank",
          sets: 3,
          reps: 1,
          weight: 0,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 1, weight: 0, completed: true, notes: "60 seconds" } as SetData,
            { setNumber: 2, reps: 1, weight: 0, completed: true, notes: "60 seconds" } as SetData,
            { setNumber: 3, reps: 1, weight: 0, completed: true, notes: "45 seconds" } as SetData
          ]
        }
      ]
    },
    // Most recent full body workout
    {
      name: "Full Body Workout",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      duration: 85,
      notes: "Added more core work to this session, feeling stronger overall",
      completed: true,
      exercises: [
        {
          name: "Deadlifts",
          sets: 3,
          reps: 5,
          weight: 125,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 5, weight: 125, completed: true },
            { setNumber: 2, reps: 5, weight: 125, completed: true },
            { setNumber: 3, reps: 5, weight: 125, completed: true }
          ]
        },
        {
          name: "Incline Bench Press",
          sets: 3,
          reps: 8,
          weight: 67.5,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 8, weight: 67.5, completed: true },
            { setNumber: 2, reps: 8, weight: 67.5, completed: true },
            { setNumber: 3, reps: 8, weight: 67.5, completed: true }
          ]
        },
        {
          name: "Pull-ups",
          sets: 3,
          reps: 10,
          weight: 0,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 10, weight: 0, completed: true },
            { setNumber: 2, reps: 9, weight: 0, completed: true },
            { setNumber: 3, reps: 8, weight: 0, completed: true }
          ]
        },
        {
          name: "Lunges",
          sets: 3,
          reps: 12,
          weight: 42.5,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 12, weight: 42.5, completed: true },
            { setNumber: 2, reps: 12, weight: 42.5, completed: true },
            { setNumber: 3, reps: 12, weight: 42.5, completed: true }
          ]
        },
        {
          name: "Lateral Raises",
          sets: 3,
          reps: 15,
          weight: 12.5,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 15, weight: 12.5, completed: true },
            { setNumber: 2, reps: 15, weight: 12.5, completed: true },
            { setNumber: 3, reps: 15, weight: 12.5, completed: true }
          ]
        },
        {
          name: "Plank",
          sets: 3,
          reps: 1,
          weight: 0,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 1, weight: 0, completed: true, notes: "75 seconds" },
            { setNumber: 2, reps: 1, weight: 0, completed: true, notes: "60 seconds" },
            { setNumber: 3, reps: 1, weight: 0, completed: true, notes: "60 seconds" }
          ]
        },
        {
          name: "Russian Twists",
          sets: 3,
          reps: 20,
          weight: 10,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 20, weight: 10, completed: true },
            { setNumber: 2, reps: 20, weight: 10, completed: true },
            { setNumber: 3, reps: 20, weight: 10, completed: true }
          ]
        }
      ]
    },
    // A sample plan mode workout (not completed)
    {
      name: "Upper Body Plan",
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
      duration: 0, // Duration will be filled in after completion
      notes: "Plan for tomorrow's session focusing on chest and triceps",
      completed: false,
      isPlanMode: true,
      exercises: [
        {
          name: "Bench Press",
          sets: 4,
          reps: 8,
          weight: 75,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 8, weight: 75, completed: false },
            { setNumber: 2, reps: 8, weight: 75, completed: false },
            { setNumber: 3, reps: 8, weight: 75, completed: false },
            { setNumber: 4, reps: 8, weight: 75, completed: false }
          ]
        },
        {
          name: "Incline Dumbbell Press",
          sets: 3,
          reps: 10,
          weight: 30,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 10, weight: 30, completed: false },
            { setNumber: 2, reps: 10, weight: 30, completed: false },
            { setNumber: 3, reps: 10, weight: 30, completed: false }
          ]
        },
        {
          name: "Cable Flyes",
          sets: 3,
          reps: 12,
          weight: 20,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 12, weight: 20, completed: false },
            { setNumber: 2, reps: 12, weight: 20, completed: false },
            { setNumber: 3, reps: 12, weight: 20, completed: false }
          ]
        },
        {
          name: "Tricep Pushdowns",
          sets: 4,
          reps: 12,
          weight: 30,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 12, weight: 30, completed: false },
            { setNumber: 2, reps: 12, weight: 30, completed: false },
            { setNumber: 3, reps: 12, weight: 30, completed: false },
            { setNumber: 4, reps: 12, weight: 30, completed: false }
          ]
        },
        {
          name: "Overhead Tricep Extension",
          sets: 3,
          reps: 15,
          weight: 20,
          unit: "kg",
          setsData: [
            { setNumber: 1, reps: 15, weight: 20, completed: false },
            { setNumber: 2, reps: 15, weight: 20, completed: false },
            { setNumber: 3, reps: 15, weight: 20, completed: false }
          ]
        }
      ]
    }
  ];
  
  // Insert the workouts and exercises
  for (const workout of workoutData) {
    console.log(`Creating workout: ${workout.name} (${workout.date.toISOString()})`);
    
    // 1. Insert the workout
    const [newWorkout] = await db.insert(workouts).values({
      userId,
      name: workout.name,
      date: workout.date,
      duration: workout.duration,
      notes: workout.notes,
      completed: workout.completed,
      isPlanMode: workout.isPlanMode || false
    }).returning();
    
    // 2. Insert the exercises
    for (const exerciseData of workout.exercises) {
      const [newExercise] = await db.insert(exercises).values({
        workoutId: newWorkout.id,
        name: exerciseData.name,
        sets: exerciseData.sets,
        reps: exerciseData.reps,
        weight: exerciseData.weight,
        unit: exerciseData.unit
      }).returning();
      
      // 3. Insert exercise sets
      if (exerciseData.setsData && exerciseData.setsData.length > 0) {
        for (const setData of exerciseData.setsData) {
          await db.insert(exerciseSets).values({
            exerciseId: newExercise.id,
            setNumber: setData.setNumber,
            reps: setData.reps,
            weight: setData.weight,
            completed: setData.completed,
            notes: 'notes' in setData ? setData.notes : undefined
          });
        }
      }
    }
    
    console.log(`Created workout ID: ${newWorkout.id}`);
  }
  
  console.log(`Added ${workoutData.length} sample workouts for user ID: ${userId}`);
  return { success: true, workoutsAdded: workoutData.length };
}

// Run this function directly when executed
async function run() {
  try {
    // Get the user ID for azim11
    const [user] = await db.select().from(users).where(eq(users.username, 'azim11'));
    
    if (!user) {
      console.error('User azim11 not found');
      process.exit(1);
    }
    
    const result = await addSampleWorkoutsForUser(user.id);
    console.log('Sample workout data added successfully:', result);
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample workout data:', error);
    process.exit(1);
  }
}

// Run the script directly when executed
run().catch(error => {
  console.error('Error running script:', error);
  process.exit(1);
});

export { addSampleWorkoutsForUser };