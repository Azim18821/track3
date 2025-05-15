// Common foods for quick-add functionality
export interface CommonFood {
  name: string;
  mealType: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
}

const commonFoods: CommonFood[] = [
  // Breakfast Items
  {
    name: "Scrambled Eggs",
    mealType: "breakfast",
    servingSize: 2,
    servingUnit: "piece",
    calories: 180,
    protein: 12,
    carbs: 2,
    fat: 14,
    category: "breakfast"
  },
  {
    name: "Oatmeal",
    mealType: "breakfast",
    servingSize: 1,
    servingUnit: "cup",
    calories: 150,
    protein: 5,
    carbs: 27,
    fat: 3,
    category: "breakfast"
  },
  {
    name: "Greek Yogurt",
    mealType: "breakfast",
    servingSize: 1,
    servingUnit: "cup",
    calories: 130,
    protein: 22,
    carbs: 8,
    fat: 0,
    category: "breakfast"
  },
  {
    name: "Whole Wheat Toast",
    mealType: "breakfast",
    servingSize: 1,
    servingUnit: "slice",
    calories: 80,
    protein: 4,
    carbs: 15,
    fat: 1,
    category: "breakfast"
  },
  {
    name: "Avocado Toast",
    mealType: "breakfast",
    servingSize: 1,
    servingUnit: "slice",
    calories: 190,
    protein: 5,
    carbs: 15,
    fat: 12,
    category: "breakfast"
  },
  
  // Lunch Items
  {
    name: "Chicken Salad",
    mealType: "lunch",
    servingSize: 1,
    servingUnit: "bowl",
    calories: 350,
    protein: 30,
    carbs: 15,
    fat: 18,
    category: "lunch"
  },
  {
    name: "Turkey Sandwich",
    mealType: "lunch",
    servingSize: 1,
    servingUnit: "serving",
    calories: 320,
    protein: 20,
    carbs: 35,
    fat: 10,
    category: "lunch"
  },
  {
    name: "Tuna Salad",
    mealType: "lunch",
    servingSize: 1,
    servingUnit: "cup",
    calories: 290,
    protein: 35,
    carbs: 8,
    fat: 14,
    category: "lunch"
  },
  {
    name: "Quinoa Bowl",
    mealType: "lunch",
    servingSize: 1,
    servingUnit: "bowl",
    calories: 380,
    protein: 12,
    carbs: 65,
    fat: 8,
    category: "lunch"
  },
  
  // Dinner Items
  {
    name: "Grilled Chicken Breast",
    mealType: "dinner",
    servingSize: 4,
    servingUnit: "oz",
    calories: 180,
    protein: 36,
    carbs: 0,
    fat: 4,
    category: "dinner"
  },
  {
    name: "Salmon Fillet",
    mealType: "dinner",
    servingSize: 4,
    servingUnit: "oz",
    calories: 240,
    protein: 23,
    carbs: 0,
    fat: 16,
    category: "dinner"
  },
  {
    name: "Brown Rice",
    mealType: "dinner",
    servingSize: 1,
    servingUnit: "cup",
    calories: 220,
    protein: 5,
    carbs: 45,
    fat: 2,
    category: "dinner"
  },
  {
    name: "Steamed Broccoli",
    mealType: "dinner",
    servingSize: 1,
    servingUnit: "cup",
    calories: 55,
    protein: 4,
    carbs: 11,
    fat: 0,
    category: "dinner"
  },
  {
    name: "Sweet Potato",
    mealType: "dinner",
    servingSize: 1,
    servingUnit: "piece",
    calories: 110,
    protein: 2,
    carbs: 26,
    fat: 0,
    category: "dinner"
  },
  
  // Snacks
  {
    name: "Apple",
    mealType: "snack",
    servingSize: 1,
    servingUnit: "piece",
    calories: 80,
    protein: 0,
    carbs: 21,
    fat: 0,
    category: "fruit"
  },
  {
    name: "Banana",
    mealType: "snack",
    servingSize: 1,
    servingUnit: "piece",
    calories: 110,
    protein: 1,
    carbs: 28,
    fat: 0,
    category: "fruit"
  },
  {
    name: "Almonds",
    mealType: "snack",
    servingSize: 1,
    servingUnit: "oz",
    calories: 170,
    protein: 6,
    carbs: 6,
    fat: 15,
    category: "nuts"
  },
  {
    name: "Protein Bar",
    mealType: "snack",
    servingSize: 1,
    servingUnit: "piece",
    calories: 200,
    protein: 20,
    carbs: 20,
    fat: 5,
    category: "protein"
  },
  
  // Drinks
  {
    name: "Protein Shake",
    mealType: "drink",
    servingSize: 1,
    servingUnit: "scoop",
    calories: 120,
    protein: 25,
    carbs: 3,
    fat: 1,
    category: "protein"
  },
  {
    name: "Orange Juice",
    mealType: "drink",
    servingSize: 8,
    servingUnit: "oz",
    calories: 110,
    protein: 1,
    carbs: 26,
    fat: 0,
    category: "drink"
  },
  {
    name: "Coffee with Milk",
    mealType: "drink",
    servingSize: 1,
    servingUnit: "cup",
    calories: 40,
    protein: 2,
    carbs: 3,
    fat: 2,
    category: "drink"
  },
  
  // Pre-Workout
  {
    name: "Banana with Peanut Butter",
    mealType: "pre-workout",
    servingSize: 1,
    servingUnit: "serving",
    calories: 200,
    protein: 4,
    carbs: 30,
    fat: 8,
    category: "pre-workout"
  },
  {
    name: "Pre-Workout Supplement",
    mealType: "pre-workout",
    servingSize: 1,
    servingUnit: "scoop",
    calories: 5,
    protein: 0,
    carbs: 1,
    fat: 0,
    category: "supplement"
  },
  
  // Post-Workout
  {
    name: "Whey Protein Shake",
    mealType: "post-workout",
    servingSize: 1,
    servingUnit: "scoop",
    calories: 120,
    protein: 24,
    carbs: 3,
    fat: 1,
    category: "protein"
  },
  {
    name: "Chocolate Milk",
    mealType: "post-workout",
    servingSize: 8,
    servingUnit: "oz",
    calories: 190,
    protein: 8,
    carbs: 26,
    fat: 5,
    category: "drink"
  }
];

// Helper function to filter common foods by meal type
export const getCommonFoodsByMealType = (mealType: string): CommonFood[] => {
  if (!mealType) return commonFoods;
  
  // Handle the morning/afternoon/evening snack types
  const isMorningSnack = mealType === 'morning_snack';
  const isAfternoonSnack = mealType === 'afternoon_snack';
  const isEveningSnack = mealType === 'evening_snack';
  
  // For all snack types, return the snack foods
  if (isMorningSnack || isAfternoonSnack || isEveningSnack) {
    return commonFoods.filter(food => food.mealType === 'snack');
  }
  
  return commonFoods.filter(food => food.mealType === mealType);
};

// Get all food categories
export const getFoodCategories = (): string[] => {
  const categories = new Set(commonFoods.map(food => food.category));
  return Array.from(categories);
};

// Get foods by category
export const getCommonFoodsByCategory = (category: string): CommonFood[] => {
  if (!category) return commonFoods;
  return commonFoods.filter(food => food.category === category);
};

export default commonFoods;