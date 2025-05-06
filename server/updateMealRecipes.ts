// This script updates the meal recipe library with new recipes
// It can be run periodically to keep the library fresh with new content

import { db } from "./db";
import { mealRecipes } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { generateRecipe } from "./mealRecipes";
import { fileURLToPath } from 'url';
import path from 'path';

// For ES modules to determine if this file is being run directly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define meal types for organization
const mealTypes = [
  "breakfast",
  "lunch",
  "dinner",
  "snack"
];

// Define budget levels
const budgetLevels = [
  "low", 
  "medium", 
  "high"
];

// Define possible dietary restrictions for variety
const dietaryRestrictions = [
  [],
  ["vegetarian"],
  ["vegan"],
  ["gluten-free"],
  ["dairy-free"],
  ["nut-free"],
  ["high-protein"],
  ["keto-friendly"]
];

/**
 * Check if a recipe with the same name or very similar content already exists
 * This does a more thorough check to avoid near-duplicate content
 */
async function recipeExists(name: string, description: string, mealType: string): Promise<boolean> {
  // Check for exact name match (case insensitive)
  const [nameMatch] = await db.select()
    .from(mealRecipes)
    .where(sql`LOWER(${mealRecipes.name}) = LOWER(${name})`);
  
  if (nameMatch) {
    return true;
  }
  
  // Check for similar recipes (same meal type with similar name)
  const similarRecipes = await db.select()
    .from(mealRecipes)
    .where(eq(mealRecipes.mealType, mealType));
  
  // Check for substring matches or high similarity
  for (const recipe of similarRecipes) {
    // If recipe name is a substring of our name or vice versa
    if (recipe.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(recipe.name.toLowerCase())) {
      return true;
    }
    
    // Simplistic similarity check for names
    const nameParts = name.toLowerCase().split(' ');
    const existingNameParts = recipe.name.toLowerCase().split(' ');
    
    // Count matching words
    const matchingWords = nameParts.filter(part => 
      existingNameParts.some(existing => existing === part)
    ).length;
    
    // If more than 70% of words match, consider it a duplicate
    if (matchingWords / Math.max(nameParts.length, existingNameParts.length) > 0.7) {
      return true;
    }
    
    // Also check description similarity for recipes with the same meal type
    // More aggressive check for recipes than exercises
    const descParts = description.toLowerCase().split(' ');
    const existingDescParts = recipe.description.toLowerCase().split(' ');
    
    const matchingDescWords = descParts.filter(part => 
      existingDescParts.some(existing => existing === part)
    ).length;
    
    // If more than 50% of description words match, it might be too similar
    if (matchingDescWords / Math.max(descParts.length, existingDescParts.length) > 0.5) {
      return true;
    }
  }
  
  return false;
}

/**
 * Update the meal recipe library by adding new recipes
 * @param count Number of new recipes to generate
 */
export async function updateMealRecipes(count: number = 8): Promise<void> {
  console.log(`Starting to update meal recipe library with ${count} new recipes...`);
  
  try {
    // Get count of existing recipes
    const existingRecipes = await db.select().from(mealRecipes);
    console.log(`Currently, the meal recipe library contains ${existingRecipes.length} recipes.`);
    
    // Map of existing recipe names for quick lookup
    const existingNames = new Set(existingRecipes.map(r => r.name.toLowerCase()));
    
    // Track recipe counts by meal type to ensure balance
    const mealTypeCounts: Record<string, number> = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0
    };
    
    // Count existing recipes by meal type
    existingRecipes.forEach(recipe => {
      if (mealTypeCounts[recipe.mealType]) {
        mealTypeCounts[recipe.mealType]++;
      }
    });
    
    console.log("Current meal type distribution:", mealTypeCounts);
    
    // Generate new recipes
    const newRecipes = [];
    let attempts = 0;
    
    // Keep generating until we have 'count' unique new recipes
    // or until we've tried a reasonable number of times
    while (newRecipes.length < count && attempts < count * 2) {
      attempts++;
      
      // Determine which meal type needs more recipes
      // Find the meal type with the fewest recipes
      let selectedMealType = mealTypes[0];
      let minCount = Infinity;
      
      for (const mealType of mealTypes) {
        const typeCount = mealTypeCounts[mealType] || 0;
        if (typeCount < minCount) {
          minCount = typeCount;
          selectedMealType = mealType;
        }
      }
      
      // Randomly select a budget level
      const budget = budgetLevels[Math.floor(Math.random() * budgetLevels.length)];
      
      // Randomly select dietary restrictions (or none)
      const dietary = dietaryRestrictions[Math.floor(Math.random() * dietaryRestrictions.length)];
      
      try {
        // Generate a new recipe using the imported function from mealRecipes.ts
        console.log(`Generating ${selectedMealType} recipe with ${budget} budget...`);
        const recipe = await generateRecipe(selectedMealType, budget, dietary);
        
        // Check if this recipe already exists or is too similar to existing ones
        const isDuplicate = await recipeExists(recipe.name, recipe.description, selectedMealType);
        
        if (!isDuplicate) {
          newRecipes.push(recipe);
          existingNames.add(recipe.name.toLowerCase());
          
          // Update our meal type counter
          mealTypeCounts[selectedMealType] = (mealTypeCounts[selectedMealType] || 0) + 1;
          
          console.log(`Generated new recipe: ${recipe.name} (${newRecipes.length}/${count})`);
        } else {
          console.log(`Skipping duplicate recipe: ${recipe.name}`);
        }
      } catch (error) {
        console.error(`Failed to generate ${selectedMealType} recipe:`, error);
      }
    }
    
    // Insert the new recipes
    if (newRecipes.length > 0) {
      const result = await db.insert(mealRecipes).values(newRecipes);
      console.log(`Successfully added ${newRecipes.length} new recipes to the library.`);
      
      // Update featured recipes after adding new ones
      await refreshFeaturedRecipes();
    } else {
      console.log("No new recipes were added to the library.");
    }
  } catch (error) {
    console.error("Error updating meal recipe library:", error);
  }
}

/**
 * Refresh the featured recipes to include some of the new ones
 */
async function refreshFeaturedRecipes(): Promise<void> {
  try {
    // First, unfeature all recipes
    await db.update(mealRecipes)
      .set({ featured: false })
      .where(eq(mealRecipes.featured, true));
  
    // Select recipes to feature (one of each meal type)
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    
    for (const mealType of mealTypes) {
      // Get random recipe of this meal type
      const [randomRecipe] = await db.select().from(mealRecipes)
        .where(eq(mealRecipes.mealType, mealType))
        .orderBy(sql`RANDOM()`)
        .limit(1);
      
      if (randomRecipe) {
        await db.update(mealRecipes)
          .set({ featured: true })
          .where(eq(mealRecipes.id, randomRecipe.id));
        
        console.log(`Set ${randomRecipe.name} as a featured ${mealType} recipe`);
      }
    }
  } catch (error) {
    console.error("Error refreshing featured recipes:", error);
  }
}

// Only auto-execute in development when explicitly run as a script
// This prevents automatic execution during production deployment
if (process.argv[1] === __filename && process.env.NODE_ENV === 'development' && process.env.MANUALLY_RUN_UPDATES === 'true') {
  // If this script is run directly
  const countArg = process.argv[2];
  const count = countArg ? parseInt(countArg, 10) : 8;
  
  updateMealRecipes(count)
    .then(() => {
      console.log("Meal recipe library update completed.");
      process.exit(0);
    })
    .catch(err => {
      console.error("Error during meal recipe library update:", err);
      process.exit(1);
    });
}