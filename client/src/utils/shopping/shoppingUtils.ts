/**
 * Utility functions for shopping list processing
 */

export interface ShoppingItem {
  name: string;
  itemName?: string; // Legacy format uses this instead of name
  brand?: string;
  quantity: string;
  unit?: string;
  estimatedCost: number;
  unitPrice?: string;
  category?: string;
  mealAssociations?: string[];
  meals?: string[]; // Legacy format uses this instead of mealAssociations
  store?: string;
  storeUrl?: string;
  url?: string;
  alternativeOptions?: Array<{
    name: string;
    store: string;
    price: number;
    storeUrl?: string;
  }>;
}

export interface DailyShoppingGroup {
  items: ShoppingItem[];
  totalCost: number;
  dayName: string;
}

/**
 * Process and normalize shopping items, ensuring valid estimated costs
 */
export function processShoppingItems(items: ShoppingItem[]): ShoppingItem[] {
  // Sort items by category and name
  return items.map(item => {
    // If estimatedCost is missing, null, undefined, or 0, provide a default price
    if (!item.estimatedCost || item.estimatedCost <= 0) {
      // Base default price
      let defaultPrice = 2.50;
      
      // Adjust price based on quantity if available
      if (item.quantity) {
        const qtyMatch = item.quantity.match(/^(\d+(\.\d+)?)/);
        if (qtyMatch && qtyMatch[1]) {
          // Apply a simple multiplier based on quantity
          const qtyNum = parseFloat(qtyMatch[1]);
          if (!isNaN(qtyNum) && qtyNum > 0) {
            defaultPrice = defaultPrice * (1 + Math.min(qtyNum / 2, 3));
          }
        }
      }
      
      return {
        ...item,
        estimatedCost: defaultPrice
      };
    }
    
    // Otherwise, just ensure it's a number
    return {
      ...item,
      estimatedCost: Number(item.estimatedCost)
    };
  }).sort((a, b) => {
    // Group by category first
    if (a.category && b.category) {
      if (a.category < b.category) return -1;
      if (a.category > b.category) return 1;
    }
    
    // Extract names for sorting - handle both formats (itemName or name)
    const aName = a.name || (a as any).itemName || '';
    const bName = b.name || (b as any).itemName || '';
    
    // Then sort by name
    return aName.localeCompare(bName);
  });
}

/**
 * Group shopping items by day of the week
 * Returns both a record by day and array for compatibility
 */
export function groupShoppingItemsByDay(items: ShoppingItem[]): { 
  byDay: Record<string, DailyShoppingGroup>, 
  dailyGroups: DailyShoppingGroup[],
  totalCost: number,
  overall: { totalCost: number, weeklyBudget: number | string }
} {
  // Define days of the week for sorting
  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  // Process items to ensure valid costs
  const processedItems = processShoppingItems(items);
  
  // Initial structure with empty days
  const dailyGroups: Record<string, DailyShoppingGroup> = {};
  
  // Initialize groups for each day
  daysOrder.forEach(day => {
    dailyGroups[day] = {
      items: [],
      totalCost: 0,
      dayName: day.charAt(0).toUpperCase() + day.slice(1)
    };
  });
  
  // Group for items without specific day association
  dailyGroups['shared'] = {
    items: [],
    totalCost: 0,
    dayName: 'Shared Items'
  };
  dailyGroups['general'] = {
    items: [],
    totalCost: 0,
    dayName: 'General'
  };
  
  // Group items by day based on meal associations
  processedItems.forEach(item => {
    let assigned = false;
    
    // Normalize item - ensure it has standard properties
    const normalizedItem = {
      ...item,
      name: item.name || (item as any).itemName || 'Unknown Item',
      mealAssociations: item.mealAssociations || (item as any).meals || []
    };
    
    // First try with mealAssociations if available
    if (normalizedItem.mealAssociations.length > 0) {
      for (const mealAssociation of normalizedItem.mealAssociations) {
        // Try to extract the day from meal association (format often includes day, e.g., "Monday Breakfast")
        const dayMatch = daysOrder.find(day => 
          mealAssociation.toLowerCase().includes(day.toLowerCase())
        );
        
        if (dayMatch) {
          dailyGroups[dayMatch].items.push(normalizedItem);
          dailyGroups[dayMatch].totalCost += Number(normalizedItem.estimatedCost) || 0;
          assigned = true;
          break; // Assign each item to first matching day only
        }
      }
    }
    
    // If no day association found, add to shared items
    if (!assigned) {
      dailyGroups['shared'].items.push(normalizedItem);
      dailyGroups['shared'].totalCost += Number(normalizedItem.estimatedCost) || 0;
    }
  });
  
  // Calculate overall total cost
  const overallTotalCost = Object.values(dailyGroups).reduce(
    (sum, group) => sum + group.totalCost, 0
  );
  
  // Convert to array format for compatibility
  const dailyGroupsArray: DailyShoppingGroup[] = [];
  
  // Define the order of days for array format
  const dayOrderArray = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Shared Items', 'General'];
  
  // Add each day with items to the array
  dayOrderArray.forEach(dayName => {
    const day = dayName.toLowerCase();
    const lowerDayName = day === 'shared items' ? 'shared' : day === 'general' ? 'general' : day;
    
    if (dailyGroups[lowerDayName] && dailyGroups[lowerDayName].items.length > 0) {
      dailyGroupsArray.push(dailyGroups[lowerDayName]);
    }
  });
  
  return {
    byDay: dailyGroups,
    dailyGroups: dailyGroupsArray,
    totalCost: overallTotalCost,
    overall: {
      totalCost: overallTotalCost,
      weeklyBudget: 0 // This will be set by the caller
    }
  };
}