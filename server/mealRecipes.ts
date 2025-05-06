import { InsertMealRecipe, MealRecipe } from "@shared/schema";
import { db } from "./db";
import { mealRecipes } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Get all meal recipes
export const getAllMealRecipes = async (): Promise<MealRecipe[]> => {
  return await db.select().from(mealRecipes).orderBy(desc(mealRecipes.createdAt));
};

// Get a single meal recipe by ID
export const getMealRecipeById = async (id: number): Promise<MealRecipe | undefined> => {
  const [recipe] = await db.select().from(mealRecipes).where(eq(mealRecipes.id, id));
  return recipe;
};

// Get featured meal recipes
export const getFeaturedMealRecipes = async (): Promise<MealRecipe[]> => {
  return await db.select().from(mealRecipes)
    .where(eq(mealRecipes.featured, true))
    .orderBy(desc(mealRecipes.createdAt));
};

// Get meal recipes by type
export const getMealRecipesByType = async (mealType: string): Promise<MealRecipe[]> => {
  return await db.select().from(mealRecipes)
    .where(eq(mealRecipes.mealType, mealType))
    .orderBy(desc(mealRecipes.createdAt));
};

// Get meal recipes by budget level
export const getMealRecipesByBudget = async (budget: string): Promise<MealRecipe[]> => {
  return await db.select().from(mealRecipes)
    .where(eq(mealRecipes.budget, budget))
    .orderBy(desc(mealRecipes.createdAt));
};

// Create a new meal recipe
export const createMealRecipe = async (recipe: InsertMealRecipe): Promise<MealRecipe> => {
  const [newRecipe] = await db.insert(mealRecipes).values(recipe).returning();
  return newRecipe;
};

// Update a meal recipe
export const updateMealRecipe = async (id: number, recipe: Partial<InsertMealRecipe>): Promise<MealRecipe | undefined> => {
  const [updatedRecipe] = await db.update(mealRecipes)
    .set({ ...recipe, updatedAt: new Date() })
    .where(eq(mealRecipes.id, id))
    .returning();
  return updatedRecipe;
};

// Delete a meal recipe
export const deleteMealRecipe = async (id: number): Promise<boolean> => {
  const [deletedRecipe] = await db.delete(mealRecipes)
    .where(eq(mealRecipes.id, id))
    .returning();
  return !!deletedRecipe;
};

// Set or unset a recipe as featured
export const toggleFeaturedRecipe = async (id: number, featured: boolean): Promise<MealRecipe | undefined> => {
  const [updatedRecipe] = await db.update(mealRecipes)
    .set({ featured, updatedAt: new Date() })
    .where(eq(mealRecipes.id, id))
    .returning();
  return updatedRecipe;
};

// Generate a random selection of recipes to feature
export const refreshFeaturedRecipes = async (): Promise<void> => {
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
    }
  }
};

// Generate a new recipe using OpenAI
export const generateRecipe = async (
  mealType: string,
  budget: string,
  dietary?: string[]
): Promise<InsertMealRecipe> => {
  try {
    const dietaryRestrictions = dietary?.join(', ') || 'None';
    
    const prompt = `
      Create a detailed, nutritious recipe with exact measurements for a ${mealType} that fits a ${budget} budget.
      
      Dietary restrictions to consider: ${dietaryRestrictions}
      
      The recipe should include:
      - A catchy, descriptive name
      - A brief description of the dish (1-2 sentences)
      - A list of ingredients with exact measurements
      - Step-by-step cooking instructions
      - Prep time in minutes
      - Cook time in minutes
      - Accurate nutrition information (calories, protein, carbs, fat)
      
      For budget considerations:
      - Low budget: Use affordable ingredients like beans, rice, eggs, frozen vegetables, etc.
      - Medium budget: Incorporate moderate-cost ingredients
      - High budget: Include premium ingredients where appropriate
      
      Your response must be in JSON format. Provide your response as a JSON object with these exact fields:
      {
        "name": "",
        "description": "",
        "ingredients": ["1 cup rice", "2 tablespoons olive oil", etc.],
        "instructions": "Step 1...\nStep 2...\nStep 3...",
        "prepTime": 0,
        "cookTime": 0,
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a professional nutritionist and chef specializing in creating delicious, healthy recipes." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to generate recipe: Empty response");
    }

    const recipeData = JSON.parse(content);
    
    // Format ingredients as JSON string
    const ingredientsStr = Array.isArray(recipeData.ingredients) 
      ? JSON.stringify(recipeData.ingredients) 
      : JSON.stringify(Object.entries(recipeData.ingredients).map(([name, amount]) => `${name}: ${amount}`));

    return {
      name: recipeData.name,
      description: recipeData.description,
      ingredients: ingredientsStr,
      instructions: recipeData.instructions,
      prepTime: recipeData.prepTime,
      cookTime: recipeData.cookTime,
      calories: recipeData.calories,
      protein: recipeData.protein,
      carbs: recipeData.carbs,
      fat: recipeData.fat,
      mealType,
      budget,
      isPublic: true,
      featured: false
    };
  } catch (error) {
    console.error("Failed to generate recipe:", error);
    throw new Error("Failed to generate recipe");
  }
};