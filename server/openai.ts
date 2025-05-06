import OpenAI from "openai";

/**
 * OpenAI Integration Module
 * 
 * This module provides integration with OpenAI's API for nutritional analysis 
 * and other AI-powered features in the fitness application.
 * 
 * Note: We use gpt-4o model which was released May 13, 2024.
 * Do not change this model unless explicitly requested by the user.
 */

// Validate and initialize the OpenAI client
if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️ OPENAI_API_KEY is not set! AI-powered features will return fallback values.");
}

// Initialize OpenAI client with proper error handling
export const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "", 
  // Increase timeout for more reliable responses
  timeout: 30000,
  maxRetries: 2
});

/**
 * Nutritional information structure returned by AI analysis
 */
export interface NutritionInfo {
  calories: number;    // Total calories
  protein: number;     // Protein in grams
  carbs: number;       // Carbohydrates in grams
  fat: number;         // Fat in grams
  servingSize: number; // Size of serving
  servingUnit: string; // Unit of measurement (e.g., g, oz, cup)
}

/**
 * Get nutritional information for a specific food item using AI analysis
 * 
 * @param foodItem - The name of the food item to analyze
 * @param servingSize - Optional serving size quantity
 * @param servingUnit - Optional serving size unit (e.g., g, oz, cup)
 * @returns Promise containing nutritional information
 */
export async function getNutritionInfo(foodItem: string, servingSize?: number, servingUnit?: string): Promise<NutritionInfo> {
  // Verify if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not available, returning default nutrition values");
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      servingSize: servingSize || 1,
      servingUnit: servingUnit || "serving"
    };
  }

  try {
    console.log(`Analyzing nutrition for: ${foodItem} (${servingSize || 1} ${servingUnit || 'serving'})`);
    
    // Call OpenAI API with nutrition analysis prompt
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Latest model for best nutrition analysis
      messages: [
        {
          role: "system",
          content: "You are a nutrition expert. Provide accurate nutritional information for the given food item. Respond with JSON containing calories, protein (g), carbs (g), fat (g), servingSize, and servingUnit. If serving size is not specified, use a reasonable default."
        },
        {
          role: "user",
          content: `Provide nutritional information for: ${foodItem}${servingSize ? `, serving size: ${servingSize}` : ''}${servingUnit ? `, serving unit: ${servingUnit}` : ''}`
        }
      ],
      response_format: { type: "json_object" } // Ensure structured response
    });

    // Parse and validate the response
    const content = response.choices[0].message.content;
    // Ensure we have valid content to parse
    const jsonContent = typeof content === 'string' ? content : '{}';
    const result = JSON.parse(jsonContent);
    
    // Convert string values to numbers if needed
    const nutritionInfo: NutritionInfo = {
      calories: typeof result.calories === 'number' ? result.calories : parseInt(result.calories || '0'),
      protein: typeof result.protein === 'number' ? result.protein : parseFloat(result.protein || '0'),
      carbs: typeof result.carbs === 'number' ? result.carbs : parseFloat(result.carbs || '0'),
      fat: typeof result.fat === 'number' ? result.fat : parseFloat(result.fat || '0'),
      servingSize: typeof result.servingSize === 'number' ? result.servingSize : parseFloat(result.servingSize || '1'),
      servingUnit: result.servingUnit || 'serving'
    };

    console.log(`Nutrition analysis complete for ${foodItem}`);
    return nutritionInfo;
  } catch (error) {
    console.error("Error fetching nutrition information:", error);
    
    // Log detailed error information for troubleshooting
    if (error instanceof Error) {
      console.error(`Error type: ${error.name}, Message: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    
    // Return default values if the API call fails
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      servingSize: servingSize || 1,
      servingUnit: servingUnit || "serving"
    };
  }
}
