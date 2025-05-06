import { extractIngredientsFromMeal } from './ingredientsApi';

// Define required interfaces directly in this file
interface MealItem {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timing?: string;
  ingredients?: Array<{
    name: string;
    quantity: string;
  }>;
}

interface ShoppingItem {
  name: string;
  quantity: string;
  unit?: string;
  estimatedCost: number;
  mealAssociations: string[];
  category?: string;
}

// This file now only uses AI for ingredient extraction - no rule-based fallbacks

// Function to merge similar items and add up quantities
function mergeShoppingItems(items: ShoppingItem[]): ShoppingItem[] {
  const mergedItems: Record<string, ShoppingItem> = {};
  
  for (const item of items) {
    const key = item.name.toLowerCase();
    
    if (mergedItems[key]) {
      // If we already have this item, merge the meal associations
      const existingItem = mergedItems[key];
      
      // Add meal association if new
      for (const association of item.mealAssociations) {
        if (!existingItem.mealAssociations.includes(association)) {
          existingItem.mealAssociations.push(association);
        }
      }
      
      // Adjust quantity if possible
      if (item.quantity && existingItem.quantity) {
        const numericQty1 = parseFloat(existingItem.quantity);
        const numericQty2 = parseFloat(item.quantity);
        
        if (!isNaN(numericQty1) && !isNaN(numericQty2)) {
          existingItem.quantity = (numericQty1 + numericQty2).toString();
        }
      }
      
      // Average the estimated costs
      existingItem.estimatedCost = (existingItem.estimatedCost + item.estimatedCost) / 2;
    } else {
      // First time seeing this item
      mergedItems[key] = { ...item };
    }
  }
  
  return Object.values(mergedItems);
}

// Generate shopping list from the meal plan
export async function generateShoppingList(mealPlan: any): Promise<ShoppingItem[]> {
  // Handle different meal plan structures
  let weeklyMeals: any = {};
  
  if (mealPlan && mealPlan.weeklyMeals) {
    weeklyMeals = mealPlan.weeklyMeals;
  } else if (mealPlan && mealPlan.mealPlan && mealPlan.mealPlan.weeklyMeals) {
    weeklyMeals = mealPlan.mealPlan.weeklyMeals;
  } else {
    console.error('No weekly meals found in meal plan structure', mealPlan);
    return [];
  }
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks', 'pre_workout', 'post_workout'];
  
  let allItems: ShoppingItem[] = [];
  
  // Track AI-processed meals to avoid duplicates
  const processedMeals = new Set<string>();
  
  // Extract ingredients from each meal for each day
  for (const day of days) {
    const dayMeals = weeklyMeals[day];
    if (!dayMeals) continue;
    
    const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1);
    
    for (const mealType of mealTypes) {
      if (mealType === 'snacks' && Array.isArray(dayMeals.snacks)) {
        // Handle snacks array
        for (const [index, snack] of dayMeals.snacks.entries()) {
          if (!snack || !snack.name || !snack.description) continue;
          
          const mealKey = `${snack.name}_${index}`;
          
          if (!processedMeals.has(mealKey)) {
            // Only use AI for ingredient extraction - no fallback
            try {
              // Get ingredients using OpenAI
              const aiIngredients = await extractIngredientsFromMeal(snack.name, snack.description);
              
              // Process the AI-generated ingredients
              const shoppingItems = aiIngredients.map(ing => ({
                name: ing.name.charAt(0).toUpperCase() + ing.name.slice(1),
                quantity: ing.quantity,
                estimatedCost: ing.name.toLowerCase().includes('beef') || 
                              ing.name.toLowerCase().includes('salmon') || 
                              ing.name.toLowerCase().includes('fish') ? 
                              5 + Math.random() * 4 : // Higher cost for premium proteins 
                              2 + Math.random() * 2,  // Standard cost for other items
                mealAssociations: [`${capitalizedDay} Snack ${index + 1}`],
                category: determineCategory(ing.name)
              }));
              
              // Add to shopping list
              allItems = [...allItems, ...shoppingItems];
              
              // Log success for debugging
              console.log(`Successfully extracted ${shoppingItems.length} ingredients from ${snack.name}`);
              if (shoppingItems.length > 0) {
                console.log(`Sample ingredients: ${shoppingItems.slice(0, 3).map((i: {name: string}) => i.name).join(', ')}`);
              }
            } catch (error) {
              console.error(`AI extraction failed for ${snack.name}`, error);
              // Don't use fallback, but add a placeholder noting extraction failed
              allItems.push({
                name: `Ingredients for ${snack.name}`,
                quantity: "Check recipe",
                estimatedCost: 0,
                mealAssociations: [`${capitalizedDay} Snack ${index + 1}`],
                category: "other"
              });
            }
            
            // Mark this snack as processed regardless of outcome
            processedMeals.add(mealKey);
          }
        }
      } else if (dayMeals[mealType]) {
        const meal = dayMeals[mealType];
        if (!meal || !meal.name || !meal.description) continue;
        
        const capitalizedMealType = mealType
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        const mealKey = `${meal.name}_${day}_${mealType}`;
        
        if (!processedMeals.has(mealKey)) {
          // Only use AI for ingredient extraction - no fallback
          try {
            // Get ingredients using OpenAI
            const aiIngredients = await extractIngredientsFromMeal(meal.name, meal.description);
            
            // Process the AI-generated ingredients
            const shoppingItems = aiIngredients.map(ing => ({
              name: ing.name.charAt(0).toUpperCase() + ing.name.slice(1),
              quantity: ing.quantity,
              estimatedCost: ing.name.toLowerCase().includes('beef') || 
                            ing.name.toLowerCase().includes('salmon') || 
                            ing.name.toLowerCase().includes('fish') ? 
                            5 + Math.random() * 4 : // Higher cost for premium proteins 
                            2 + Math.random() * 2,  // Standard cost for other items
              mealAssociations: [`${capitalizedDay} ${capitalizedMealType}`],
              category: determineCategory(ing.name)
            }));
            
            // Add to shopping list
            allItems = [...allItems, ...shoppingItems];
            
            // Log success for debugging
            console.log(`Successfully extracted ${shoppingItems.length} ingredients from ${meal.name}`);
            if (shoppingItems.length > 0) {
              console.log(`Sample ingredients: ${shoppingItems.slice(0, 3).map((i: {name: string}) => i.name).join(', ')}`);
            }
          } catch (error) {
            console.error(`AI extraction failed for ${meal.name}`, error);
            // Don't use fallback, but add a placeholder noting extraction failed
            allItems.push({
              name: `Ingredients for ${meal.name}`,
              quantity: "Check recipe",
              estimatedCost: 0,
              mealAssociations: [`${capitalizedDay} ${capitalizedMealType}`],
              category: "other"
            });
          }
          
          // Mark this meal as processed regardless of outcome
          processedMeals.add(mealKey);
        }
      }
    }
  }
  
  // Merge similar items
  const mergedItems = mergeShoppingItems(allItems);
  
  return mergedItems;
}

// Helper function to determine category based on ingredient name
function determineCategory(ingredientName: string): string {
  const categories = {
    'meat': [
      'chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'cod', 'shrimp', 
      'steak', 'ground beef', 'mince', 'prawns', 'tilapia', 'sausage', 'bacon', 'ham',
      'fillet', 'burger', 'meatball', 'meatloaf', 'ribeye', 'sirloin', 'tenderloin', 'chop',
      'drumstick', 'thigh', 'breast', 'wing', 'seafood', 'shellfish', 'crab', 'lobster',
      'sardines', 'anchovy', 'mackerel', 'trout', 'halibut', 'brisket', 'ribs'
    ],
    'dairy': [
      'milk', 'cheese', 'yogurt', 'cream', 'butter', 'cheddar', 'mozzarella', 'feta', 
      'parmesan', 'ricotta', 'sour cream', 'cottage cheese', 'greek yogurt', 'ice cream',
      'whipped cream', 'buttermilk', 'half and half', 'quark', 'dairy', 'creamer'
    ],
    'produce': [
      'apple', 'banana', 'spinach', 'lettuce', 'tomato', 'carrot', 'potato', 'onion', 
      'garlic', 'broccoli', 'cauliflower', 'pepper', 'cucumber', 'avocado', 'berries',
      'celery', 'kale', 'orange', 'lemon', 'lime', 'grapefruit', 'peach', 'pear', 'plum',
      'cherry', 'grape', 'watermelon', 'melon', 'cantaloupe', 'honeydew', 'pineapple',
      'mango', 'papaya', 'kiwi', 'asparagus', 'eggplant', 'cabbage', 'mushroom', 'zucchini',
      'squash', 'sweet potato', 'yam', 'beet', 'radish', 'leafy green', 'fruit', 'vegetable'
    ],
    'grains': [
      'rice', 'pasta', 'bread', 'oats', 'cereal', 'quinoa', 'couscous', 'flour', 'tortilla',
      'bagel', 'baguette', 'roll', 'noodle', 'spaghetti', 'macaroni', 'penne', 'barley',
      'buckwheat', 'cornmeal', 'grits', 'pita', 'wrap', 'taco shell', 'cracker', 'breadcrumb',
      'panko', 'biscuit', 'muffin', 'breakfast cereal', 'granola', 'bulgur', 'farro', 'millet'
    ],
    'canned': [
      'beans', 'chickpeas', 'lentils', 'tomato sauce', 'soup', 'tuna', 'corn', 'canned',
      'preserved', 'jarred', 'pickled', 'tomato paste', 'diced tomatoes', 'crushed tomatoes',
      'kidney beans', 'black beans', 'pinto beans', 'cannellini beans', 'baked beans', 
      'green beans', 'olives', 'artichoke hearts', 'peas', 'carrots', 'mixed vegetables'
    ],
    'baking': [
      'sugar', 'honey', 'oil', 'vinegar', 'spice', 'herb', 'vanilla', 'baking powder', 
      'baking soda', 'cocoa', 'chocolate chips', 'brown sugar', 'powdered sugar',
      'maple syrup', 'molasses', 'corn syrup', 'extract', 'food coloring', 'sprinkles',
      'frosting', 'icing', 'cake mix', 'bread flour', 'pastry flour', 'all-purpose flour',
      'cornstarch', 'yeast', 'salt', 'pepper', 'cinnamon', 'nutmeg', 'ginger', 'oregano',
      'basil', 'thyme', 'rosemary', 'sage', 'bay leaf', 'paprika', 'cumin', 'turmeric'
    ],
  };
  
  const lowercaseName = ingredientName.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowercaseName.includes(keyword))) {
      return category;
    }
  }
  
  // Special handling for protein ingredients to make sure we don't miss any meats
  if (/\b(fillet|steak|chop|ground)\b/i.test(lowercaseName)) {
    return 'meat';
  }
  
  return 'other';
}

// Export the interfaces for use in other components
export type { ShoppingItem };