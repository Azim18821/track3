/**
 * Utility to generate a structured shopping list from extracted ingredients
 */

interface Ingredient {
  name: string;
  quantity: string | number;
  unit: string;
  category?: string;
  estimated_price?: number;
  optional?: boolean;
  store?: string;
}

interface ShoppingListItem extends Ingredient {
  checked: boolean;
  // Keep store_name for backward compatibility
  // But we now rely on the 'store' property directly from the AI-generated data
  store_name?: string;
}

interface CategorizedShoppingList {
  [category: string]: ShoppingListItem[];
}

/**
 * Convert extracted ingredient data into a structured shopping list
 * 
 * @param extractedIngredients - Ingredients data from OpenAI extraction
 * @param budget - User's budget for groceries (optional)
 * @param preferredStore - User's preferred grocery store (optional)
 * @returns A categorized shopping list with price estimates
 */
export async function generateShoppingList(
  extractedIngredients: any, 
  budget?: number,
  preferredStore?: string
): Promise<any> {
  console.log("[PLAN DEBUG] generateShoppingList called with:", 
             extractedIngredients ? Object.keys(extractedIngredients).join(', ') : 'undefined ingredients');
  
  try {
    // Safety check for invalid inputs
    if (!extractedIngredients) {
      console.error("[PLAN DEBUG] extractedIngredients is null or undefined");
      return {
        categories: {},
        items: [],
        totalCost: 0,
        budgetStatus: "unknown",
        status: "error",
        message: "No ingredients data available"
      };
    }
    
    if (extractedIngredients.error) {
      console.error("[PLAN DEBUG] extractedIngredients contains error:", extractedIngredients.error);
      return {
        categories: {},
        items: [],
        totalCost: 0,
        budgetStatus: "unknown",
        status: "error",
        message: extractedIngredients.error
      };
    }
    
    // Extract all ingredients from the extracted data
    console.log("[PLAN DEBUG] Extracting ingredients from data structure");
    const allIngredients = extractIngredientsFromData(extractedIngredients);
    console.log(`[PLAN DEBUG] Extracted ${allIngredients.length} ingredients`);
    
    // Categorize and format ingredients for shopping
    console.log("[PLAN DEBUG] Categorizing ingredients");
    const categorizedList = categorizeIngredients(allIngredients);
    
    // Get total number of items
    const totalItems = Object.values(categorizedList).reduce((sum, items) => sum + items.length, 0);
    console.log(`[PLAN DEBUG] Created categorized list with ${totalItems} items in ${Object.keys(categorizedList).length} categories`);
    
    // Calculate total cost from AI-generated prices
    let totalCost = 0;
    let budgetStatus = "unknown";
    
    // Always calculate total cost from the AI-generated prices
    console.log(`[PLAN DEBUG] Calculating total cost from AI-generated prices`);
    
    totalCost = Object.values(categorizedList).reduce((sum, items) => 
      sum + items.reduce((itemSum, item) => itemSum + (item.estimated_price || 0), 0), 0);
    
    // Determine budget status if budget is provided
    if (budget) {
      budgetStatus = totalCost <= budget ? "under_budget" : "over_budget";
      console.log(`[PLAN DEBUG] Total cost: ${totalCost}, Budget: ${budget}, Status: ${budgetStatus}`);
    }
    
    // Create flat list for easier manipulation in UI
    const items = Object.entries(categorizedList).flatMap(([category, categoryItems]) => 
      categoryItems.map(item => ({...item, category}))
    );
    
    // Return enhanced structure with budget information
    return {
      categories: categorizedList,
      items,
      totalCost,
      budgetStatus,
      status: "success"
    };
  } catch (error) {
    console.error("[PLAN DEBUG] Error in generateShoppingList:", error);
    return {
      categories: {},
      items: [],
      totalCost: 0,
      budgetStatus: "unknown",
      status: "error",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

// Function for realistic packaging adjustment has been removed
// The OpenAI prompt should directly include instructions to provide 
// realistic package sizes in the generated meal plans and shopping lists

/**
 * Extract ingredients from the data structure returned by OpenAI
 */
function extractIngredientsFromData(extractedData: any): Ingredient[] {
  const ingredients: Ingredient[] = [];
  
  // Handle different possible formats from OpenAI extraction
  
  // Format 1: Categories with ingredient arrays
  if (extractedData.categories) {
    Object.entries(extractedData.categories).forEach(([category, items]: [string, any]) => {
      if (Array.isArray(items)) {
        items.forEach(item => {
          ingredients.push({
            name: item.name,
            quantity: item.quantity || 'as needed',
            unit: item.unit || '',
            category,
            optional: item.optional || false,
            estimated_price: item.price || item.estimated_price || undefined,
            store: item.store || undefined
          });
        });
      }
    });
  }
  
  // Format 2: Direct ingredients list
  else if (extractedData.ingredients && Array.isArray(extractedData.ingredients)) {
    extractedData.ingredients.forEach((item: any) => {
      ingredients.push({
        name: item.name,
        quantity: item.quantity || 'as needed',
        unit: item.unit || '',
        category: item.category || 'Other',
        optional: item.optional || false,
        estimated_price: item.price || item.estimated_price || undefined,
        store: item.store || undefined
      });
    });
  }
  
  // Format 3: Categorized object structure
  else {
    Object.entries(extractedData).forEach(([category, items]: [string, any]) => {
      if (Array.isArray(items)) {
        items.forEach(item => {
          ingredients.push({
            name: typeof item === 'string' ? item : item.name,
            quantity: item.quantity || 'as needed',
            unit: item.unit || '',
            category,
            optional: item.optional || false,
            estimated_price: item.price || item.estimated_price || undefined,
            store: item.store || undefined
          });
        });
      }
    });
  }
  
  // No adjustment needed - the OpenAI prompt should directly provide realistic package sizes
  // and accurate pricing based on the store selection
  return ingredients;
}

/**
 * Categorize ingredients into a structured shopping list
 */
function categorizeIngredients(ingredients: Ingredient[]): CategorizedShoppingList {
  const standardCategories = [
    'Produce',
    'Meat & Seafood',
    'Dairy & Eggs',
    'Grains & Bread',
    'Canned Goods',
    'Frozen',
    'Pantry',
    'Spices & Herbs',
    'Beverages',
    'Other'
  ];
  
  // Initialize categories
  const categorizedList: CategorizedShoppingList = {};
  standardCategories.forEach(category => {
    categorizedList[category] = [];
  });
  
  // Map ingredients to standard categories
  ingredients.forEach(ingredient => {
    let targetCategory = mapToStandardCategory(ingredient.category || 'Other');
    
    // Convert to shopping list item
    const shoppingItem: ShoppingListItem = {
      ...ingredient,
      category: targetCategory,
      checked: false
    };
    
    // Add to the appropriate category
    categorizedList[targetCategory] = categorizedList[targetCategory] || [];
    categorizedList[targetCategory].push(shoppingItem);
  });
  
  // Remove empty categories and sort items alphabetically
  Object.keys(categorizedList).forEach(category => {
    if (categorizedList[category].length === 0) {
      delete categorizedList[category];
    } else {
      categorizedList[category].sort((a, b) => a.name.localeCompare(b.name));
    }
  });
  
  return categorizedList;
}

/**
 * Map various category names to standard categories
 */
function mapToStandardCategory(category: string): string {
  category = category.toLowerCase();
  
  if (/produce|vegetable|fruit|veg|fresh/i.test(category)) return 'Produce';
  if (/meat|poultry|beef|chicken|pork|seafood|fish/i.test(category)) return 'Meat & Seafood';
  if (/dairy|cheese|milk|egg|yogurt/i.test(category)) return 'Dairy & Eggs';
  if (/grain|bread|pasta|rice|cereal/i.test(category)) return 'Grains & Bread';
  if (/can|tin|canned/i.test(category)) return 'Canned Goods';
  if (/frozen/i.test(category)) return 'Frozen';
  if (/pantry|dry good|staple|baking/i.test(category)) return 'Pantry';
  if (/spice|herb|seasoning/i.test(category)) return 'Spices & Herbs';
  if (/beverage|drink|juice|water/i.test(category)) return 'Beverages';
  
  return 'Other';
}

// The price estimation function has been removed as per request
// Instead, the OpenAI prompt needs to include instructions to generate realistic
// package sizes (e.g., 250ml, 500ml, 1L for liquids; 100g, 250g, 500g, 1kg for foods)
// and accurate pricing directly in the response