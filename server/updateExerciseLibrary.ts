// This script updates the exercise library with new exercises
// It can be run periodically to keep the library fresh with new content

import { db } from "./db";
import { exerciseLibrary } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import OpenAI from "openai";
import { fileURLToPath } from 'url';
import path from 'path';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// For ES modules to determine if this file is being run directly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ExerciseData {
  name: string;
  description: string;
  muscleGroup: string;
  difficulty: string;
  videoUrl?: string;
  imageUrl?: string;
  instructions: string;
}

// Define muscle groups for organization
const muscleGroups = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
  "fullbody",
  "cardio"
];

/**
 * Generate a new exercise using OpenAI
 * @param muscleGroup The target muscle group
 * @param difficulty The difficulty level (beginner, intermediate, advanced)
 * @returns A complete exercise data object
 */
async function generateExercise(muscleGroup: string, difficulty: string): Promise<ExerciseData> {
  const prompt = `
    Create a detailed exercise for ${muscleGroup} muscles with ${difficulty} difficulty level.
    
    The exercise should include:
    - A standard, widely recognized name (avoid made-up exercises)
    - A brief description explaining the primary benefits and muscles worked
    - Step-by-step instructions formatted as numbered steps
    - The exercise should be realistic and safe for gym or home settings
    
    Format your response as a JSON object with these fields:
    {
      "name": "Exercise Name",
      "description": "Brief description of the exercise",
      "muscleGroup": "${muscleGroup}",
      "difficulty": "${difficulty}",
      "instructions": "1. First step\\n2. Second step\\n3. Third step..."
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a professional fitness trainer specializing in exercise physiology and proper form." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to generate exercise: Empty response");
    }

    const exercise = JSON.parse(content);
    
    // Optional: Search for a relevant YouTube video tutorial
    // This is a placeholder - in a production environment, you might
    // use YouTube API to find a relevant tutorial video
    const videoUrl = await findVideoForExercise(exercise.name);
    
    return {
      name: exercise.name,
      description: exercise.description,
      muscleGroup: muscleGroup,
      difficulty: difficulty,
      instructions: exercise.instructions,
      videoUrl: videoUrl
    };
  } catch (error) {
    console.error("Error generating exercise:", error);
    throw new Error(`Failed to generate ${muscleGroup} exercise`);
  }
}

/**
 * Find a relevant YouTube video for an exercise
 * This is a placeholder function - in a production app,
 * you would use the YouTube API to find relevant videos
 */
async function findVideoForExercise(exerciseName: string): Promise<string | undefined> {
  // In a real implementation, you would integrate with YouTube API
  // For now, we'll return a placeholder string
  // Format: https://www.youtube.com/watch?v={VIDEO_ID}
  
  // This is just a simplified mock that in reality would use an API
  const commonVideoIds: Record<string, string> = {
    "Squat": "aclHkVaku9U",
    "Deadlift": "op9kVnSso6Q",
    "Bench Press": "rT7DgCr-3pg",
    "Pull-up": "eGo4IYlbE5g",
    "Push-up": "IODxDxX7oi4",
    "Lunge": "QOVaHwm-Q6U",
    "Plank": "pSHjTRCQxIw"
  };
  
  // Check if we have a video for this specific exercise
  const exerciseKey = Object.keys(commonVideoIds).find(key => 
    exerciseName.toLowerCase().includes(key.toLowerCase())
  );
  
  if (exerciseKey) {
    return `https://www.youtube.com/watch?v=${commonVideoIds[exerciseKey]}`;
  }
  
  return undefined;
}

/**
 * Check if an exercise with the same name or very similar content already exists
 * This does a more thorough check to avoid near-duplicate content
 */
async function exerciseExists(name: string, description: string, muscleGroup: string): Promise<boolean> {
  // Check for exact name match (case insensitive)
  const [nameMatch] = await db.select()
    .from(exerciseLibrary)
    .where(sql`LOWER(${exerciseLibrary.name}) = LOWER(${name})`);
  
  if (nameMatch) {
    return true;
  }
  
  // Check for similar exercises (same muscle group with similar name)
  const similarExercises = await db.select()
    .from(exerciseLibrary)
    .where(eq(exerciseLibrary.muscleGroup, muscleGroup));
  
  // Check for substring matches or high similarity
  for (const exercise of similarExercises) {
    // If exercise name is a substring of our name or vice versa
    if (exercise.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(exercise.name.toLowerCase())) {
      return true;
    }
    
    // Simplistic similarity check (could be improved with proper string similarity algorithm)
    const nameParts = name.toLowerCase().split(' ');
    const existingNameParts = exercise.name.toLowerCase().split(' ');
    
    // Count matching words
    const matchingWords = nameParts.filter(part => 
      existingNameParts.some(existing => existing === part)
    ).length;
    
    // If more than 70% of words match, consider it a duplicate
    if (matchingWords / Math.max(nameParts.length, existingNameParts.length) > 0.7) {
      return true;
    }
  }
  
  return false;
}

/**
 * Update the exercise library by adding new exercises
 * @param count Number of new exercises to generate
 */
export async function updateExerciseLibrary(count: number = 8): Promise<void> {
  console.log(`Starting to update exercise library with ${count} new exercises...`);
  
  try {
    // Get count of existing exercises
    const existingExercises = await db.select().from(exerciseLibrary);
    console.log(`Currently, the exercise library contains ${existingExercises.length} exercises.`);
    
    // Map of existing exercise names for quick lookup
    const existingNames = new Set(existingExercises.map(e => e.name.toLowerCase()));
    
    // Generate new exercises
    const newExercises: ExerciseData[] = [];
    let attempts = 0;
    
    // Keep generating until we have 'count' unique new exercises
    // or until we've tried a reasonable number of times
    while (newExercises.length < count && attempts < count * 2) {
      attempts++;
      
      // Randomly select a muscle group and difficulty
      const muscleGroup = muscleGroups[Math.floor(Math.random() * muscleGroups.length)];
      const difficulties = ["beginner", "intermediate", "advanced"];
      const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
      
      try {
        // Generate a new exercise
        const exercise = await generateExercise(muscleGroup, difficulty);
        
        // Check if this exercise already exists or is too similar to existing ones
        const isDuplicate = await exerciseExists(exercise.name, exercise.description, exercise.muscleGroup);
        
        if (!isDuplicate) {
          newExercises.push(exercise);
          existingNames.add(exercise.name.toLowerCase());
          console.log(`Generated new exercise: ${exercise.name} (${newExercises.length}/${count})`);
        } else {
          console.log(`Skipping duplicate exercise: ${exercise.name}`);
        }
      } catch (error) {
        console.error(`Failed to generate exercise for ${muscleGroup}:`, error);
      }
    }
    
    // Insert the new exercises
    if (newExercises.length > 0) {
      const result = await db.insert(exerciseLibrary).values(newExercises);
      console.log(`Successfully added ${newExercises.length} new exercises to the library.`);
    } else {
      console.log("No new exercises were added to the library.");
    }
  } catch (error) {
    console.error("Error updating exercise library:", error);
  }
}

// Only auto-execute in development when explicitly run as a script
// This prevents automatic execution during production deployment
if (process.argv[1] === __filename && process.env.NODE_ENV === 'development' && process.env.MANUALLY_RUN_UPDATES === 'true') {
  // If this script is run directly
  const countArg = process.argv[2];
  const count = countArg ? parseInt(countArg, 10) : 8;
  
  updateExerciseLibrary(count)
    .then(() => {
      console.log("Exercise library update completed.");
      process.exit(0);
    })
    .catch(err => {
      console.error("Error during exercise library update:", err);
      process.exit(1);
    });
}