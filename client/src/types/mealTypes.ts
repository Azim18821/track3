export interface MealItem {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timing?: string;
}

export interface DailyMeals {
  breakfast: MealItem;
  lunch: MealItem;
  dinner: MealItem;
  snacks: MealItem[];
  pre_workout?: MealItem;
  post_workout?: MealItem;
  evening_meal?: MealItem;
  [key: string]: MealItem | MealItem[] | undefined;
}

export interface WeeklyMeals {
  monday: DailyMeals;
  tuesday: DailyMeals;
  wednesday: DailyMeals;
  thursday: DailyMeals;
  friday: DailyMeals;
  saturday: DailyMeals;
  sunday: DailyMeals;
  [key: string]: DailyMeals;
}

export interface MealPlan {
  weeklyMeals: WeeklyMeals;
  notes: string;
  dailyMeals?: DailyMeals; // Legacy support
}