/**
 * Types for the step-by-step plan generation process
 */

// Represents each step in the plan generation process
export enum PlanGenerationStep {
  INITIALIZE = 0,
  NUTRITION_CALCULATION = 1,
  WORKOUT_PLAN = 2,
  MEAL_PLAN = 3,
  EXTRACT_INGREDIENTS = 4,
  SHOPPING_LIST = 5,
  COMPLETE = 6
}

// Status response from the step-coach API
export interface StepStatusResponse {
  isGenerating: boolean;
  step: PlanGenerationStep;
  stepMessage: string;
  estimatedTimeRemaining: number;
  totalSteps: number;
  errorMessage?: string | null;
  isComplete?: boolean;
}

// Result response from the step-coach API
export interface StepResultResponse {
  workoutPlan: any;
  mealPlan: any;
  nutritionData: any;
  shoppingList: any;
}

// Plan input parameters
export interface PlanInput {
  age: number;
  sex: 'male' | 'female';
  height: number; // in cm
  weight: number; // in kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
  fitnessGoal: 'weight_loss' | 'muscle_gain' | 'strength' | 'stamina' | 'endurance';
  dietaryPreferences: string[];
  weeklyBudget: number | string;
  workoutDaysPerWeek: number;
  preferredWorkoutDays?: string[];
  workoutDuration?: number;
  workoutNames?: Record<string, string>;
  notifyByEmail?: boolean;
  email?: string;
  location?: string;
}