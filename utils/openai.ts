import OpenAI from "openai";

// Initialize the OpenAI client with the API key from environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Extract ingredients from a single meal description
 * 
 * @param mealName - The name of the meal
 * @param mealDescription - The description of the meal including the recipe
 * @returns Extracted and structured ingredients list for a single meal
 */
export async function extractIngredientsFromSingleMeal(mealName: string, mealDescription: string): Promise<any> {
  let retryCount = 0;
  const maxRetries = 3;
  const backoffMs = 1000; // Start with 1 second
  
  // Function to create structured fallback if all attempts fail
  const createFallbackStructure = (name: string, desc: string) => {
    console.log(`Creating fallback ingredient structure for meal: ${name}`);
    
    // Extract known ingredients from the description if available
    const knownIngredients = [];
    
    // Simple regex to match ingredient patterns from description
    // This is a basic fallback extraction method
    const ingredientRegex = /(\d+(?:\.\d+)?)\s*(?:g|kg|ml|l|cups?|tbsp|tsp|oz)\s+([a-zA-Z ]+)/g;
    let match;
    
    // Parse meal description for potential ingredients  
    if (desc) {
      const ingredientsSection = desc.match(/ingredients:\s*\[(.*?)\]/i);
      if (ingredientsSection && ingredientsSection[1]) {
        const ingredientsList = ingredientsSection[1].split(',');
        
        ingredientsList.forEach(ingredient => {
          // Clean up the ingredient string
          const cleanIngredient = ingredient.replace(/["'\[\]]/g, '').trim();
          
          // Try to separate quantity and name
          const parts = cleanIngredient.match(/^([\d.]+)?\s*(g|kg|ml|l|cups?|tbsp|tsp|oz)?\s*(.+)$/);
          
          if (parts) {
            const [_, quantity, unit, name] = parts;
            knownIngredients.push({
              name: name || cleanIngredient,
              quantity: quantity || "1",
              unit: unit || "",
              category: guessCategory(name || cleanIngredient)
            });
          } else {
            knownIngredients.push({
              name: cleanIngredient,
              quantity: "as needed",
              unit: "",
              category: guessCategory(cleanIngredient)
            });
          }
        });
      } else {
        // Use regex to find ingredients if no explicit ingredients list
        while ((match = ingredientRegex.exec(desc)) !== null) {
          const quantity = match[1];
          const unitMatch = match[0].match(/(?:g|kg|ml|l|cups?|tbsp|tsp|oz)/);
          const unit = unitMatch ? unitMatch[0] : '';
          const name = match[2].trim();
          
          knownIngredients.push({
            name,
            quantity,
            unit,
            category: guessCategory(name)
          });
        }
      }
    }
    
    // If no ingredients were found, create a minimal structure based on name
    if (knownIngredients.length === 0) {
      // Extract possible food items from the name
      const possibleItems = name.split(/\s+and\s+|\s+with\s+|\s*,\s*|\s+&\s+/);
      
      possibleItems.forEach(item => {
        if (item.length > 2 && !['the', 'and', 'with'].includes(item.toLowerCase())) {
          knownIngredients.push({
            name: item.trim(),
            quantity: "as needed",
            unit: "",
            category: guessCategory(item.trim())
          });
        }
      });
      
      // If still no ingredients, add a placeholder with the meal name
      if (knownIngredients.length === 0) {
        knownIngredients.push({
          name: name,
          quantity: "1",
          unit: "serving",
          category: "Other"
        });
      }
    }
    
    // Create standard fallback structure
    return {
      mealName: name,
      categories: {
        "Produce": knownIngredients.filter(i => i.category === "Produce"),
        "Protein": knownIngredients.filter(i => i.category === "Protein"),
        "Dairy": knownIngredients.filter(i => i.category === "Dairy"),
        "Grains": knownIngredients.filter(i => i.category === "Grains"),
        "Other": knownIngredients.filter(i => i.category === "Other")
      },
      totalCount: knownIngredients.length
    };
  };
  
  // Helper to guess ingredient category
  function guessCategory(name: string): string {
    name = name.toLowerCase();
    
    const categories = {
      Produce: [
        'apple', 'banana', 'berry', 'broccoli', 'carrot', 'celery', 'cucumber', 
        'fruit', 'garlic', 'ginger', 'lemon', 'lettuce', 'onion', 'pepper', 
        'potato', 'spinach', 'tomato', 'vegetable', 'avocado'
      ],
      Protein: [
        'beef', 'chicken', 'fish', 'meat', 'pork', 'salmon', 'tuna', 'turkey',
        'tofu', 'tempeh', 'sausage', 'steak', 'shrimp', 'protein'
      ],
      Dairy: [
        'butter', 'cheese', 'cream', 'milk', 'yogurt', 'dairy', 'egg'
      ],
      Grains: [
        'bread', 'cereal', 'flour', 'grain', 'oat', 'pasta', 'rice', 
        'wheat', 'quinoa', 'bun', 'roll', 'cracker', 'tortilla'
      ]
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return category;
      }
    }
    
    return "Other";
  }
  
  // Main extraction logic with retry
  while (retryCount <= maxRetries) {
    try {
      console.log(`Extracting ingredients for meal: ${mealName} (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // Use OpenAI to extract and organize the ingredients
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a nutrition expert helping to extract ingredients from meal descriptions.
            Parse the provided meal description and create a comprehensive, structured list of ingredients.
            
            Follow these rules when extracting ingredients:
            1. Extract the exact quantity and unit of each ingredient
            2. If quantities or units are ambiguous, make a reasonable estimation
            3. Group ingredients by category (produce, meat, dairy, grains, etc.)
            4. Identify optional ingredients and mark them as such
            5. Convert uncommon measurements to standard units
            6. Include nutritional estimates if possible (calories, protein, etc.)
            
            Provide your response in a structured JSON format suitable for programmatic use.`
          },
          {
            role: "user",
            content: `Here is the meal name and description. Please extract all ingredients with quantities and units:\n\nMeal: ${mealName}\n\nDescription: ${mealDescription}`
          }
        ],
        response_format: { type: "json_object" }
      });
      
      const extractedIngredientsData = JSON.parse(response.choices[0].message.content || "{}");
      console.log("Single meal ingredients extracted successfully");
      
      return extractedIngredientsData;
    } catch (error) {
      retryCount++;
      console.error(`Error extracting ingredients (attempt ${retryCount}/${maxRetries + 1}):`, error);
      
      // If we've reached the max retries, create a fallback structure
      if (retryCount > maxRetries) {
        console.warn(`All ${maxRetries + 1} attempts failed for meal: ${mealName}, using fallback structure`);
        return createFallbackStructure(mealName, mealDescription);
      }
      
      // Exponential backoff
      const waitTime = backoffMs * Math.pow(2, retryCount - 1);
      console.log(`Waiting ${waitTime}ms before retry ${retryCount + 1}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // Should never get here but for type safety
  return createFallbackStructure(mealName, mealDescription);
}

/**
 * Extract ingredients from a meal plan using OpenAI
 * 
 * @param mealPlan - The full meal plan object
 * @returns Extracted and structured ingredients list
 */
export async function extractIngredientsFromMealPlan(mealPlan: any): Promise<any> {
  console.log("[PLAN DEBUG] extractIngredientsFromMealPlan called with mealPlan structure:", 
              mealPlan ? Object.keys(mealPlan).join(', ') : 'undefined meal plan');
  
  if (!mealPlan || !mealPlan.weeklyMealPlan) {
    console.log("[PLAN DEBUG] Invalid meal plan structure detected:", 
                JSON.stringify(mealPlan, null, 2));
    throw new Error("Invalid meal plan structure");
  }
  
  try {
    console.log("[PLAN DEBUG] Extracting ingredients using OpenAI day-by-day approach...");
    console.log("[PLAN DEBUG] OpenAI API Key exists:", !!process.env.OPENAI_API_KEY);
    
    // Preprocess the meal plan to extract just the ingredients
    const formattedMealPlan = formatMealPlanForExtraction(mealPlan);
    console.log("[PLAN DEBUG] Formatted meal plan days:", 
                Object.keys(formattedMealPlan).join(', '));
                
    // Process one day at a time to avoid token limits
    const allIngredients = {
      categories: {
        produce: [] as any[],
        protein: [] as any[],
        dairy: [] as any[],
        grains: [] as any[],
        other: [] as any[]
      },
      totalCount: 0
    };
    
    // Process days in sequence
    const days = Object.keys(formattedMealPlan);
    console.log(`[PLAN DEBUG] Processing ${days.length} days sequentially`);
    
    for (const day of days) {
      const dayMeals = formattedMealPlan[day];
      
      // Skip days with no meal data
      if (!dayMeals || Object.keys(dayMeals).length === 0) {
        console.log(`[PLAN DEBUG] Skipping ${day} - no meal data found`);
        continue;
      }
      
      console.log(`[PLAN DEBUG] Processing ${day} with ${Object.keys(dayMeals).length} meals`);
      
      try {
        // Process this day's meals
        const dayIngredients = await extractIngredientsForSingleDay(day, dayMeals);
        
        // Skip if day extraction returned an error structure
        if (dayIngredients.error) {
          console.error(`[PLAN DEBUG] Error in day extraction for ${day}: ${dayIngredients.error}`);
          continue;
        }
        
        // Generate stats for logging, with safe access to array length
        const categoryStats = Object.entries(dayIngredients.categories || {})
          .map(([cat, items]) => `${cat}(${Array.isArray(items) ? items.length : 0})`)
          .join(', ');
        
        console.log(`[PLAN DEBUG] Successfully extracted ingredients for ${day}: ${categoryStats}`);
        
        // Merge with overall ingredient list
        mergeIngredients(allIngredients, dayIngredients);
        
      } catch (dayError) {
        console.error(`[PLAN DEBUG] Error processing ${day}:`, dayError);
        // Continue with other days despite error
      }
      
      // Add a longer delay between API calls to avoid rate limits (5 seconds instead of 2)
      console.log(`[PLAN DEBUG] Adding longer delay before processing next day after ${day} to avoid rate limits`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Calculate total ingredient count
    let totalCount = 0;
    // Manually count all ingredients in each category
    for (const category of Object.values(allIngredients.categories)) {
      if (Array.isArray(category)) {
        totalCount += category.length;
      }
    }
    allIngredients.totalCount = totalCount;
    
    console.log(`[PLAN DEBUG] Completed extraction of all days. Total ingredients: ${allIngredients.totalCount}`);
    
    // Generate category statistics for logging
    const categoryStats = Object.entries(allIngredients.categories)
      .map(([cat, items]) => `${cat}(${Array.isArray(items) ? items.length : 0})`)
      .join(', ');
    
    console.log(`[PLAN DEBUG] Extracted ingredients categories: ${categoryStats}`);
    
    return allIngredients;
  } catch (error) {
    console.error("Error extracting ingredients:", error);
    
    // Return a fallback structure instead of throwing to prevent plan generation failure
    return { 
      categories: { produce: [], protein: [], dairy: [], grains: [], other: [] },
      totalCount: 0,
      error: `Failed to extract ingredients: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Extract ingredients from a single day's meals
 * Processes one day at a time to avoid token limits
 */
async function extractIngredientsForSingleDay(day: string, dayMeals: any, maxRetries = 3): Promise<any> {
  let retryCount = 0;
  let lastError: any = null;
  
  // Retry loop with exponential backoff
  while (retryCount <= maxRetries) {
    try {
      console.log(`[PLAN DEBUG] Extracting ingredients for ${day} using OpenAI... (Attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // Use OpenAI to extract and organize the ingredients for this day
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a nutrition expert helping to extract ingredients from a single day's meals. 
            Parse the provided meal data and create a structured, organized ingredient list.
            
            Follow these rules when creating the ingredient list:
            1. Combine duplicate ingredients and sum their quantities
            2. Standardize units (e.g., convert tablespoons to cups where appropriate)
            3. Group ingredients by category (produce, protein, dairy, grains, other)
            4. Extract quantities and units where available
            5. Sort ingredients within each category alphabetically
            
            Provide your response in a structured JSON format suitable for programmatic use.
            
            IMPORTANT: Return a valid JSON object with at least these fields, even if the data is incomplete:
            {
              "categories": {
                "produce": [],
                "protein": [],
                "dairy": [],
                "grains": [],
                "other": []
              },
              "totalCount": 0
            }`
          },
          {
            role: "user",
            content: `Here are the meals for ${day}. Please extract and organize all ingredients:\n\n${JSON.stringify(dayMeals, null, 2)}`
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Safely parse the JSON with fallback structure
      if (!response?.choices[0]?.message?.content) {
        throw new Error(`Empty response from OpenAI for ${day}`);
      }
      
      const extractedIngredientsData = JSON.parse(response.choices[0].message.content);
      
      // Calculate total count if not provided
      if (!extractedIngredientsData.totalCount) {
        let total = 0;
        // Manually iterate over categories to count ingredients
        if (extractedIngredientsData.categories) {
          for (const category of Object.values(extractedIngredientsData.categories)) {
            if (Array.isArray(category)) {
              total += category.length;
            }
          }
        }
        extractedIngredientsData.totalCount = total;
      }
      
      console.log(`[PLAN DEBUG] Successfully extracted ${extractedIngredientsData.totalCount} ingredients for ${day}`);
      
      // Success - return the data
      return extractedIngredientsData;
      
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error
      const isRateLimit = error.status === 429 || 
                         (error.message && error.message.includes('Rate limit'));
      
      if (isRateLimit && retryCount < maxRetries) {
        // Calculate backoff time: 5s, 10s, 20s...
        const backoffTime = 5000 * Math.pow(2, retryCount);
        
        console.log(`[PLAN DEBUG] Rate limit hit for ${day}. Retrying in ${backoffTime/1000}s (Attempt ${retryCount + 1}/${maxRetries})`);
        
        // Wait for backoff period
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        
        // Increment retry counter and try again
        retryCount++;
      } else {
        // Not a rate limit error or we've exhausted retries
        console.error(`[PLAN DEBUG] Error extracting ingredients for ${day} (${retryCount + 1}/${maxRetries + 1} attempts):`, error);
        
        // Return fallback structure
        return { 
          categories: { produce: [], protein: [], dairy: [], grains: [], other: [] },
          totalCount: 0,
          error: `Failed to extract ingredients for ${day}: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }
  
  // If we reach here, we've exhausted all retries
  console.error(`[PLAN DEBUG] All ${maxRetries + 1} attempts failed for ${day}`, lastError);
  
  return { 
    categories: { produce: [], protein: [], dairy: [], grains: [], other: [] },
    totalCount: 0,
    error: `Failed to extract ingredients for ${day} after ${maxRetries + 1} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  };
}

/**
 * Merge two ingredient lists together
 */
function mergeIngredients(target: any, source: any): void {
  // Ensure both have the expected structure
  if (!target.categories || !source.categories) {
    console.error('[PLAN DEBUG] Invalid structure for merging ingredients');
    return;
  }
  
  // Merge each category
  for (const category of Object.keys(source.categories)) {
    // Create category in target if it doesn't exist
    if (!target.categories[category]) {
      target.categories[category] = [];
    }
    
    // Add ingredients from source to target
    if (Array.isArray(source.categories[category])) {
      target.categories[category] = [...target.categories[category], ...source.categories[category]];
    }
  }
}

/**
 * Format the meal plan for ingredient extraction
 * Simplifies the structure to focus just on ingredients
 */
function formatMealPlanForExtraction(mealPlan: any): any {
  try {
    if (!mealPlan || !mealPlan.weeklyMealPlan || typeof mealPlan.weeklyMealPlan !== 'object') {
      console.error("[PLAN DEBUG] Invalid meal plan structure in formatMealPlanForExtraction:", 
                    JSON.stringify(mealPlan, null, 2));
      throw new Error('Invalid meal plan structure - missing weeklyMealPlan object');
    }

    console.log("[PLAN DEBUG] formatMealPlanForExtraction starting with mealPlan.weeklyMealPlan keys:", 
                Object.keys(mealPlan.weeklyMealPlan));
    
    const simplifiedMealPlan: Record<string, any> = {};
    
    // Process each day in the meal plan
    Object.entries(mealPlan.weeklyMealPlan).forEach(([day, meals]: [string, any]) => {
      // Skip days with invalid or missing meal data
      if (!meals || typeof meals !== 'object') {
        console.log(`[PLAN DEBUG] Skipping day ${day} - invalid or missing meal data`);
        return;
      }
      
      console.log(`[PLAN DEBUG] Processing day: ${day} with meal types:`, 
                  Object.keys(meals).join(', '));
      
      simplifiedMealPlan[day] = {};
      let hasMeals = false;
      
      // Process each meal type (breakfast, lunch, dinner, etc.)
      Object.entries(meals).forEach(([mealType, meal]: [string, any]) => {
        console.log(`[PLAN DEBUG] Processing ${day} - ${mealType}, meal type:`, 
                    Array.isArray(meal) ? 'array' : typeof meal);
        
        // Handle snacks array separately
        if (mealType === 'snacks' && Array.isArray(meal)) {
          // Filter out snacks with no ingredients
          const validSnacks = meal
            .filter(snack => snack && snack.ingredients && Array.isArray(snack.ingredients) && snack.ingredients.length > 0)
            .map((snack: any) => ({
              name: snack?.name || 'Unnamed Snack',
              ingredients: snack?.ingredients || []
            }));
            
          if (validSnacks.length > 0) {
            simplifiedMealPlan[day][mealType] = validSnacks;
            hasMeals = true;
          } else {
            console.log(`[PLAN DEBUG] Skipping ${day} - ${mealType}, no valid snacks with ingredients found`);
          }
        } 
        // Handle regular meals
        else if (meal && typeof meal === 'object' && meal.ingredients && Array.isArray(meal.ingredients) && meal.ingredients.length > 0) {
          simplifiedMealPlan[day][mealType] = {
            name: meal.name || `${mealType} Meal`,
            ingredients: meal.ingredients
          };
          hasMeals = true;
        } else {
          console.log(`[PLAN DEBUG] Skipping ${day} - ${mealType}, invalid structure or no ingredients:`, 
                      JSON.stringify(meal, null, 2));
        }
      });
      
      // If no valid meals were found for this day, remove the empty day entry
      if (!hasMeals) {
        console.log(`[PLAN DEBUG] Removing ${day} from simplified meal plan - no valid meals found`);
        delete simplifiedMealPlan[day];
      }
    });
    
    // Check if we have any valid days
    const dayCount = Object.keys(simplifiedMealPlan).length;
    console.log(`[PLAN DEBUG] Formatted meal plan has ${dayCount} valid days:`, 
                Object.keys(simplifiedMealPlan).join(', '));
                
    if (dayCount === 0) {
      console.error("[PLAN DEBUG] No valid meal data found in any day");
      throw new Error('No valid meal data found with ingredients');
    }
    
    return simplifiedMealPlan;
  } catch (error) {
    console.error("[PLAN DEBUG] Error in formatMealPlanForExtraction:", error);
    // Return a minimal valid structure to prevent downstream errors
    return { 
      error: "Failed to format meal plan properly",
      errorMessage: error instanceof Error ? error.message : String(error),
      rawStructure: typeof mealPlan === 'object' ? JSON.stringify(Object.keys(mealPlan || {})) : 'invalid mealPlan'
    };
  }
}

/**
 * Analyze a workout form image using OpenAI Vision
 * 
 * @param imageBase64 - The base64-encoded image data
 * @returns Analysis of the workout form with feedback
 */
export async function analyzeImage(imageBase64: string): Promise<any> {
  try {
    console.log("Analyzing workout image with OpenAI Vision...");
    
    // Use OpenAI to analyze the image
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a professional fitness trainer analyzing workout form in images.
          Provide detailed feedback on the exercise form shown in the image.
          
          Follow these guidelines when analyzing the image:
          1. Identify the exercise being performed
          2. Assess the overall form quality (Good, Needs Improvement, Poor)
          3. Point out specific form issues if any are visible
          4. Provide actionable tips for improvement
          5. Note any potential injury risks
          6. If the image is unclear or doesn't show an exercise, state this clearly
          
          Provide your response in a structured JSON format with clear sections.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this workout form image and provide detailed feedback:"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ],
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const analysisData = JSON.parse(response.choices[0].message.content || "{}");
    console.log("Workout image analysis completed successfully");
    
    return analysisData;
  } catch (error) {
    console.error("Error analyzing workout image:", error);
    throw new Error("Failed to analyze workout image");
  }
}