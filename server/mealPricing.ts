import { OpenAI } from 'openai';
import { FitnessPlan } from '@shared/schema';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Interface definitions
export interface MealPriceInfo {
  price: number;  // The price in GBP
  currency: string; // 'GBP'
  itemizedIngredients: {
    name: string;
    quantity: string;
    unitPrice: number;
    totalPrice: number;
  }[];
}

interface MealItem {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  priceInfo?: MealPriceInfo;
}

interface DayMeals {
  breakfast: MealItem;
  lunch: MealItem;
  dinner: MealItem;
  snacks: MealItem[];
  pre_workout?: MealItem;
  post_workout?: MealItem;
  evening_meal?: MealItem;
  [key: string]: MealItem | MealItem[] | undefined;
}

interface WeeklyMeals {
  [day: string]: DayMeals;
}

interface MealPlan {
  weeklyMeals: WeeklyMeals;
  notes?: string;
  costSummary?: {
    totalWeeklyCost: number;
    currency: string;
    averageMealCost: number;
    mealCount: number;
  };
}

/**
 * Calculate the price of a specific meal based on its description
 * @param mealName The name of the meal
 * @param mealDescription The description of the meal
 * @param preferredStore Optional store preference (Tesco, Sainsbury's, Asda, etc.)
 * @returns Price information for the meal
 */
export async function calculateMealPrice(
  mealName: string,
  mealDescription: string,
  preferredStore: string = 'Tesco'
): Promise<MealPriceInfo> {
  try {
    console.log(`Calculating price for meal: ${mealName}`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a meal price calculator for a fitness app. 
          Your task is to analyze meal descriptions and calculate the approximate cost of ingredients from ${preferredStore}.
          You should return a detailed JSON object with the total price and itemized ingredients.
          Use realistic UK prices from ${preferredStore} for common package sizes (not just the exact amount needed).
          
          For example, if a recipe needs 50g of rice, calculate for the smallest available package (e.g., 500g).
          Find the median price for each ingredient when multiple options exist.
          Return prices in GBP (£) with 2 decimal places.`
        },
        {
          role: "user",
          content: `Calculate the price for this meal: "${mealName}"
          
          Recipe/Description: ${mealDescription}
          
          Respond with a JSON object containing:
          1. "price": Total price in GBP (numeric value only, e.g. 4.50)
          2. "currency": Always "GBP"
          3. "itemizedIngredients": Array of ingredients with name, quantity, unitPrice, and totalPrice
          
          Do not include any explanations, just the JSON object.`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the AI response
    const priceData = JSON.parse(response.choices[0].message.content || "{}");
    
    // Ensure we have a valid price structure
    const result: MealPriceInfo = {
      price: typeof priceData.price === 'number' ? priceData.price : 0,
      currency: priceData.currency || 'GBP',
      itemizedIngredients: Array.isArray(priceData.itemizedIngredients) 
        ? priceData.itemizedIngredients 
        : []
    };
    
    return result;
  } catch (error) {
    console.error("Error calculating meal price:", error);
    // Return default values in case of error
    return {
      price: 0,
      currency: 'GBP',
      itemizedIngredients: []
    };
  }
}

/**
 * Calculate prices for all meals in a week
 * @param mealPlan The meal plan structure from the fitness plan
 * @param preferredStore The preferred grocery store
 * @returns Updated meal plan with prices
 */
export async function calculateWeeklyMealPrices(
  mealPlan: any,
  preferredStore: string = 'Tesco'
): Promise<any> {
  if (!mealPlan || !mealPlan.weeklyMeals) {
    console.log('No valid meal plan provided for price calculation');
    return mealPlan;
  }
  
  const updatedMealPlan = { ...mealPlan };
  
  // Process each day
  for (const [day, meals] of Object.entries(mealPlan.weeklyMeals)) {
    updatedMealPlan.weeklyMeals[day] = { ...meals };
    const dayMeals = updatedMealPlan.weeklyMeals[day];
    
    // Process standard meals (breakfast, lunch, dinner)
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    for (const mealType of mealTypes) {
      if (dayMeals[mealType]) {
        const meal = dayMeals[mealType];
        try {
          const priceInfo = await calculateMealPrice(
            meal.name,
            meal.description,
            preferredStore
          );
          
          // Update the meal with price information
          dayMeals[mealType] = {
            ...meal,
            priceInfo
          };
        } catch (error) {
          console.error(`Error pricing ${mealType} on ${day}:`, error);
        }
      }
    }
    
    // Process snacks array
    if (Array.isArray(dayMeals.snacks)) {
      const updatedSnacks = [];
      
      for (let i = 0; i < dayMeals.snacks.length; i++) {
        const snack = dayMeals.snacks[i];
        try {
          const priceInfo = await calculateMealPrice(
            snack.name,
            snack.description,
            preferredStore
          );
          
          updatedSnacks.push({
            ...snack,
            priceInfo
          });
        } catch (error) {
          console.error(`Error pricing snack ${i} on ${day}:`, error);
          updatedSnacks.push(snack);
        }
      }
      
      dayMeals.snacks = updatedSnacks;
    }
    
    // Process additional meals if present (pre_workout, post_workout, evening_meal)
    const additionalMealTypes = ['pre_workout', 'post_workout', 'evening_meal'];
    for (const mealType of additionalMealTypes) {
      if (dayMeals[mealType] && typeof dayMeals[mealType] === 'object') {
        const meal = dayMeals[mealType];
        try {
          const priceInfo = await calculateMealPrice(
            meal.name,
            meal.description,
            preferredStore
          );
          
          // Update the meal with price information
          dayMeals[mealType] = {
            ...meal,
            priceInfo
          };
        } catch (error) {
          console.error(`Error pricing ${mealType} on ${day}:`, error);
        }
      }
    }
  }
  
  // Calculate total weekly cost
  let totalWeeklyCost = 0;
  let mealCount = 0;
  
  for (const day of Object.values(updatedMealPlan.weeklyMeals)) {
    // Add standard meals cost
    for (const mealType of ['breakfast', 'lunch', 'dinner']) {
      if (day[mealType]?.priceInfo?.price) {
        totalWeeklyCost += day[mealType].priceInfo.price;
        mealCount++;
      }
    }
    
    // Add snacks cost
    if (Array.isArray(day.snacks)) {
      for (const snack of day.snacks) {
        if (snack?.priceInfo?.price) {
          totalWeeklyCost += snack.priceInfo.price;
          mealCount++;
        }
      }
    }
    
    // Add additional meals cost
    for (const mealType of ['pre_workout', 'post_workout', 'evening_meal']) {
      if (day[mealType]?.priceInfo?.price) {
        totalWeeklyCost += day[mealType].priceInfo.price;
        mealCount++;
      }
    }
  }
  
  // Add weekly cost summary to the meal plan
  updatedMealPlan.costSummary = {
    totalWeeklyCost: parseFloat(totalWeeklyCost.toFixed(2)),
    currency: 'GBP',
    averageMealCost: mealCount > 0 ? parseFloat((totalWeeklyCost / mealCount).toFixed(2)) : 0,
    mealCount
  };
  
  return updatedMealPlan;
}

/**
 * Generate a combined 7-day meal view for the meal plan
 * @param mealPlan The meal plan from the fitness plan
 * @returns A combined view of all meals for the week
 */
export function getCombinedWeeklyMeals(mealPlan: any): any {
  if (!mealPlan || !mealPlan.weeklyMeals) {
    return { 
      meals: [],
      totalCost: 0,
      currency: 'GBP'
    };
  }
  
  const combinedMeals = [];
  let totalCost = 0;
  
  // Map day indices to names for display
  const dayNames = {
    'monday': 'Monday',
    'tuesday': 'Tuesday',
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'friday': 'Friday',
    'saturday': 'Saturday',
    'sunday': 'Sunday'
  };
  
  // Process each day
  for (const [dayKey, meals] of Object.entries(mealPlan.weeklyMeals)) {
    const dayName = dayNames[dayKey] || dayKey;
    
    // Process standard meals (breakfast, lunch, dinner)
    for (const mealType of ['breakfast', 'lunch', 'dinner']) {
      if (meals[mealType]) {
        const meal = meals[mealType];
        const mealCost = meal.priceInfo?.price || 0;
        
        combinedMeals.push({
          day: dayName,
          type: mealType.charAt(0).toUpperCase() + mealType.slice(1),
          meal: {
            name: meal.name,
            description: meal.description,
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat
          },
          price: mealCost,
          currency: 'GBP'
        });
        
        totalCost += mealCost;
      }
    }
    
    // Process snacks
    if (Array.isArray(meals.snacks)) {
      meals.snacks.forEach((snack, index) => {
        const snackCost = snack.priceInfo?.price || 0;
        
        combinedMeals.push({
          day: dayName,
          type: `Snack ${index + 1}`,
          meal: {
            name: snack.name,
            description: snack.description,
            calories: snack.calories,
            protein: snack.protein,
            carbs: snack.carbs,
            fat: snack.fat
          },
          price: snackCost,
          currency: 'GBP'
        });
        
        totalCost += snackCost;
      });
    }
    
    // Process additional meals if present
    for (const mealType of ['pre_workout', 'post_workout', 'evening_meal']) {
      if (meals[mealType] && typeof meals[mealType] === 'object') {
        const meal = meals[mealType];
        const mealCost = meal.priceInfo?.price || 0;
        
        // Format the meal type for display (e.g., pre_workout -> Pre-workout)
        const formattedType = mealType
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join('-');
        
        combinedMeals.push({
          day: dayName,
          type: formattedType,
          meal: {
            name: meal.name,
            description: meal.description,
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat
          },
          price: mealCost,
          currency: 'GBP'
        });
        
        totalCost += mealCost;
      }
    }
  }
  
  return {
    meals: combinedMeals,
    totalCost: parseFloat(totalCost.toFixed(2)),
    currency: 'GBP'
  };
}