import express from 'express';
import { extractIngredientsFromMealPlan } from '../utils/openai';
import { ensureAuthenticated } from './auth';

const router = express.Router();

/**
 * Extract ingredients from a meal plan and generate a shopping list
 * POST /api/ingredients/meal-plan-extract
 */
router.post('/meal-plan-extract', ensureAuthenticated, async (req, res) => {
  try {
    const { mealPlan } = req.body;
    
    if (!mealPlan) {
      return res.status(400).json({ message: 'Meal plan data is required' });
    }

    // Check if plan belongs to user
    // Implement storage check here
    
    // Extract ingredients using OpenAI
    const shoppingList = await extractIngredientsFromMealPlan(mealPlan);
    
    // Optionally save the shopping list to the user's plan in storage
    
    return res.status(200).json({ 
      success: true, 
      shoppingList 
    });
  } catch (error: any) {
    console.error('Error generating shopping list:', error);
    return res.status(500).json({ 
      message: 'Failed to generate shopping list',
      error: error.message || 'Unknown error'
    });
  }
});

/**
 * Extract ingredients from a single meal description
 * POST /api/ingredients/extract
 */
router.post('/extract', ensureAuthenticated, async (req, res) => {
  try {
    const { mealName, mealDescription } = req.body;
    
    if (!mealName || !mealDescription) {
      return res.status(400).json({ 
        success: false,
        message: 'Meal name and description are required' 
      });
    }
    
    // Process the meal with our AI extraction function
    const ingredients = await extractIngredientsFromSingleMeal(mealName, mealDescription);
    
    return res.status(200).json({
      success: true,
      ingredients
    });
  } catch (error: any) {
    console.error('Error extracting ingredients:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to extract ingredients',
      error: error.message || 'Unknown error'
    });
  }
});

/**
 * Process an image for workout form analysis
 * POST /api/fitness-plans/analyze-workout-image
 */
router.post('/analyze-workout-image', ensureAuthenticated, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ message: 'Image data is required' });
    }

    // Import analyzeImage function dynamically to avoid loading it unless needed
    const { analyzeImage } = await import('../utils/openai');
    const analysis = await analyzeImage(imageBase64);
    
    return res.status(200).json({ 
      success: true, 
      analysis 
    });
  } catch (error: any) {
    console.error('Error analyzing workout image:', error);
    return res.status(500).json({ 
      message: 'Failed to analyze workout image',
      error: error.message || 'Unknown error'
    });
  }
});

export default router;