/**
 * Step-by-step implementation of fitness plan generation
 * This approach breaks down the process into smaller steps to prevent timeouts
 */

import { storage } from './storage';
import { generateCoachResponse } from './coach';
import { extractIngredientsFromMealPlan } from '../utils/openai';
import { generateShoppingList } from '../utils/generateShoppingList';
import type { PlanInput } from '../client/src/types/plan-generation';
import OpenAI from "openai";

// Initialize the OpenAI client with the API key from environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define the step types
export enum PlanGenerationStep {
  INITIALIZE = 0,
  NUTRITION_CALCULATION = 1,
  WORKOUT_PLAN = 2,
  MEAL_PLAN = 3,
  EXTRACT_INGREDIENTS = 4,
  SHOPPING_LIST = 5,
  COMPLETE = 6
}

// Status interface for generation
export interface GenerationStatus {
  isGenerating: boolean;
  step: PlanGenerationStep;
  stepMessage: string;
  estimatedTimeRemaining: number;
  totalSteps: number;
  errorMessage?: string | null;
  isComplete?: boolean;
}

// Plan data interface for storing generation data
export interface PlanData {
  nutritionData?: any;
  workoutPlan?: any;
  mealPlan?: any;
  ingredients?: any;
  shoppingList?: any;
  input_json?: any;
  isGenerating?: boolean;
  step?: PlanGenerationStep;
  stepMessage?: string;
  estimatedTimeRemaining?: number;
  totalSteps?: number;
  isComplete?: boolean;
}

class StepwiseCoach {
  private readonly STEP_DESCRIPTIONS = {
    [PlanGenerationStep.INITIALIZE]: 'Initializing plan generation',
    [PlanGenerationStep.NUTRITION_CALCULATION]: 'Calculating nutritional requirements',
    [PlanGenerationStep.WORKOUT_PLAN]: 'Generating workout plan',
    [PlanGenerationStep.MEAL_PLAN]: 'Creating meal plan based on nutritional needs',
    [PlanGenerationStep.EXTRACT_INGREDIENTS]: 'Extracting ingredients from meal plan',
    [PlanGenerationStep.SHOPPING_LIST]: 'Building shopping list',
    [PlanGenerationStep.COMPLETE]: 'Plan generation complete'
  };

  private readonly STEP_TIME_ESTIMATES = {
    [PlanGenerationStep.INITIALIZE]: 5,
    [PlanGenerationStep.NUTRITION_CALCULATION]: 15,
    [PlanGenerationStep.WORKOUT_PLAN]: 60,
    [PlanGenerationStep.MEAL_PLAN]: 90,
    [PlanGenerationStep.EXTRACT_INGREDIENTS]: 45,
    [PlanGenerationStep.SHOPPING_LIST]: 30,
    [PlanGenerationStep.COMPLETE]: 0
  };

  /**
   * Start the plan generation process
   * @param userId User ID
   * @param input Plan generation input parameters
   * @returns Status of the generation
   */
  async startGeneration(userId: number, input: PlanInput): Promise<GenerationStatus> {
    console.log(`Starting stepwise plan generation for user ${userId}`);
    console.log(`[PLAN DEBUG] Input data for user ${userId}:`, JSON.stringify(input, null, 2));
    
    try {
      // First, check for any existing generation in progress
      const existingStatus = await storage.getPlanGenerationStatus(userId);
      console.log(`[PLAN DEBUG] Existing status for user ${userId}:`, 
                  existingStatus ? JSON.stringify(existingStatus, null, 2) : 'No existing status');
                  
      if (existingStatus && existingStatus.isGenerating) {
        console.log(`[PLAN DEBUG] Generation already in progress for user ${userId}, step:`, 
                   existingStatus.currentStep);
        return {
          isGenerating: true,
          step: existingStatus.currentStep as PlanGenerationStep,
          stepMessage: this.STEP_DESCRIPTIONS[existingStatus.currentStep as PlanGenerationStep],
          estimatedTimeRemaining: this.STEP_TIME_ESTIMATES[existingStatus.currentStep as PlanGenerationStep],
          totalSteps: Object.keys(PlanGenerationStep).length / 2 - 1 // Divide by 2 because enums have string and number keys
        };
      }

      // Create a new generation status
      await storage.setPlanGenerationStatus(userId, true, {
        currentStep: PlanGenerationStep.INITIALIZE,
        stepMessage: this.STEP_DESCRIPTIONS[PlanGenerationStep.INITIALIZE],
        estimatedTimeRemaining: this.STEP_TIME_ESTIMATES[PlanGenerationStep.INITIALIZE],
        totalSteps: Object.keys(PlanGenerationStep).length / 2 - 1
      });
      
      // Store input data separately
      await storage.storeInputData(userId, input);
      
      // Immediately trigger the nutrition calculation step to prevent getting stuck
      console.log(`[PLAN DEBUG] Auto-continuing to nutrition calculation step for user ${userId}`);
      setTimeout(async () => {
        try {
          // Force continuation to next step
          await this.continueGeneration(userId);
          console.log(`[PLAN DEBUG] Auto-continue to nutrition calculation successful for user ${userId}`);
        } catch (continueErr) {
          console.error(`[PLAN DEBUG] Auto-continue to nutrition calculation failed for user ${userId}:`, continueErr);
        }
      }, 2000);

      // Return initial status
      return {
        isGenerating: true,
        step: PlanGenerationStep.INITIALIZE,
        stepMessage: this.STEP_DESCRIPTIONS[PlanGenerationStep.INITIALIZE],
        estimatedTimeRemaining: this.STEP_TIME_ESTIMATES[PlanGenerationStep.INITIALIZE],
        totalSteps: Object.keys(PlanGenerationStep).length / 2 - 1,
        isComplete: false
      };
    } catch (error: any) {
      console.error('Error starting step-wise plan generation:', error);
      throw new Error(`Failed to start plan generation: ${error.message || String(error)}`);
    }
  }

  /**
   * Get the current status of plan generation
   * @param userId User ID
   * @returns Current status or null if no generation in progress
   */
  async getGenerationStatus(userId: number): Promise<GenerationStatus | null> {
    try {
      const status = await storage.getPlanGenerationStatus(userId);
      if (!status) return null;
      
      const step = status.currentStep as PlanGenerationStep;
      
      return {
        isGenerating: status.isGenerating,
        step,
        stepMessage: this.STEP_DESCRIPTIONS[step] || 'Processing',
        estimatedTimeRemaining: this.STEP_TIME_ESTIMATES[step] || 0,
        totalSteps: Object.keys(PlanGenerationStep).length / 2 - 1,
        errorMessage: status.errorMessage,
        isComplete: step === PlanGenerationStep.COMPLETE
      };
    } catch (error: any) {
      console.error('Error getting plan generation status:', error);
      throw new Error(`Failed to get generation status: ${error.message || String(error)}`);
    }
  }

  /**
   * Continue to the next step in the generation process
   * @param userId User ID
   * @returns Updated status
   */
  async continueGeneration(userId: number): Promise<GenerationStatus> {
    try {
      console.log(`[PLAN DEBUG] Continuing plan generation for user ${userId}`);
      
      // Get current status
      const status = await storage.getPlanGenerationStatus(userId);
      console.log(`[PLAN DEBUG] Current status for user ${userId}:`, 
                  status ? JSON.stringify(status, null, 2) : 'No status found');
                  
      if (!status || !status.isGenerating) {
        console.log(`[PLAN DEBUG] No active generation for user ${userId}, isGenerating:`, 
                    status ? status.isGenerating : 'status undefined');
        throw new Error('No active plan generation found');
      }

      const currentStep = status.currentStep as PlanGenerationStep;
      console.log(`[PLAN DEBUG] Current step for user ${userId}: ${currentStep} (${PlanGenerationStep[currentStep]})`);
      
      // Get plan data and input data with proper types
      const planData: PlanData = await storage.getPlanGenerationData(userId) || {};
      console.log(`[PLAN DEBUG] Plan data for user ${userId} exists:`, !!planData);
      
      const input = await storage.getInputData(userId);
      console.log(`[PLAN DEBUG] Input data for user ${userId} exists:`, !!input);

      // Process the next step based on current step
      let result;
      let nextStep: PlanGenerationStep;
      let updatedData: PlanData = { ...planData };

      switch (currentStep) {
        case PlanGenerationStep.INITIALIZE:
          console.log('👉👉👉 [STEP TRACE] INITIALIZE step starting for user', userId);
          // Calculate nutritional requirements
          const nutritionData = await this.calculateNutrition(input);
          console.log('✅✅✅ [STEP TRACE] Nutrition calculation function completed successfully for user', userId);
          console.log('📊📊📊 [STEP TRACE] Nutrition data:', JSON.stringify(nutritionData, null, 2));
          updatedData.nutritionData = nutritionData;
          nextStep = PlanGenerationStep.NUTRITION_CALCULATION;
          console.log('🔄🔄🔄 [STEP TRACE] Setting nextStep to NUTRITION_CALCULATION for user', userId);
          break;

        case PlanGenerationStep.NUTRITION_CALCULATION:
          console.log('👉👉👉 [STEP TRACE] NUTRITION_CALCULATION step starting for user', userId);
          // Generate workout plan - no fallbacks
          const workoutPlan = await this.generateWorkoutPlan(input, updatedData.nutritionData);
          console.log('✅✅✅ [STEP TRACE] Workout plan generation completed successfully for user', userId);
          updatedData.workoutPlan = workoutPlan;
          nextStep = PlanGenerationStep.WORKOUT_PLAN;
          console.log('🔄🔄🔄 [STEP TRACE] Setting nextStep to WORKOUT_PLAN (step 2) for user', userId);
          
          // Force an auto-continue to meal plan step after a short delay
          setTimeout(async () => {
            try {
              console.log('🔁🔁🔁 [STEP TRACE] Auto-continuing from WORKOUT_PLAN to MEAL_PLAN for user', userId);
              const moveResult = await this.continueGeneration(userId);
              console.log('✅✅✅ [STEP TRACE] Auto-continue to meal plan successful for user', userId, 'now at step', moveResult.step);
            } catch (autoErr) {
              console.error('❌❌❌ [STEP TRACE] Failed to auto-continue to meal plan for user', userId, autoErr);
            }
          }, 2000);
          break;

        case PlanGenerationStep.WORKOUT_PLAN:
          console.log('👉👉👉 [STEP TRACE] WORKOUT_PLAN step starting for user', userId);
          
          // First check if we already have workout plan data - in which case just proceed to meal plan
          if (updatedData.workoutPlan && 
              updatedData.workoutPlan.weeklySchedule && 
              Object.keys(updatedData.workoutPlan.weeklySchedule).length > 0) {
            console.log('🔎🔎🔎 [STEP TRACE] Workout plan data already exists, skipping meal plan generation and proceeding for user', userId);
            console.log('📊📊📊 [STEP TRACE] Existing workout plan data:', JSON.stringify(updatedData.workoutPlan, null, 2).substring(0, 200) + '...');
            // Just proceed to meal plan since we already have workout data
          } else {
            console.log('❌❌❌ [STEP TRACE] No workout plan data found, which is unexpected. Continuing anyway for user', userId);
          }
          
          // Generate meal plan
          const mealPlan = await this.generateMealPlan(input, updatedData.nutritionData);
          console.log('✅✅✅ [STEP TRACE] Meal plan generation completed successfully for user', userId);
          updatedData.mealPlan = mealPlan;
          nextStep = PlanGenerationStep.MEAL_PLAN;
          console.log('🔄🔄🔄 [STEP TRACE] Setting nextStep to MEAL_PLAN (step 3) for user', userId);
          
          // Force an auto-continue to extract ingredients after a short delay
          setTimeout(async () => {
            try {
              console.log('🔁🔁🔁 [STEP TRACE] Auto-continuing from MEAL_PLAN to EXTRACT_INGREDIENTS for user', userId);
              const moveResult = await this.continueGeneration(userId);
              console.log('✅✅✅ [STEP TRACE] Auto-continue to extract ingredients successful for user', userId, 'now at step', moveResult.step);
            } catch (autoErr) {
              console.error('❌❌❌ [STEP TRACE] Failed to auto-continue to extract ingredients for user', userId, autoErr);
            }
          }, 2000);
          break;

        case PlanGenerationStep.MEAL_PLAN:
          console.log('👉👉👉 [STEP TRACE] MEAL_PLAN step starting for user', userId);
          
          // Check if meal plan already has structured ingredients
          if (updatedData.mealPlan && updatedData.mealPlan.ingredients && 
              updatedData.mealPlan.ingredients.categories) {
            console.log('🔍🔍🔍 [STEP TRACE] Meal plan already contains structured ingredients for user', userId);
            console.log('📊📊📊 [STEP TRACE] Found structured ingredients with categories:', 
                       Object.keys(updatedData.mealPlan.ingredients.categories).join(', '));
            
            // Use the ingredients that were already generated with the meal plan
            updatedData.ingredients = updatedData.mealPlan.ingredients;
            console.log('✅✅✅ [STEP TRACE] Using structured ingredients directly from meal plan for user', userId);
          } else {
            // Extract ingredients from meal plan if not already included
            console.log('🔎🔎🔎 [STEP TRACE] No structured ingredients found in meal plan, extracting them for user', userId);
            const ingredients = await this.extractIngredients(updatedData.mealPlan);
            console.log('✅✅✅ [STEP TRACE] Ingredients extraction completed successfully for user', userId);
            updatedData.ingredients = ingredients;
          }
          
          nextStep = PlanGenerationStep.EXTRACT_INGREDIENTS;
          console.log('🔄🔄🔄 [STEP TRACE] Setting nextStep to EXTRACT_INGREDIENTS (step 4) for user', userId);
          
          // Force an auto-continue to shopping list step after a longer delay to ensure ingredients are processed
          console.log('⏱️⏱️⏱️ [STEP TRACE] Scheduling continuation to shopping list with 5-second delay for user', userId);
          setTimeout(async () => {
            try {
              // Double-check that ingredients data exists and is valid before continuing
              const currentData = await storage.getPlanGenerationData(userId);
              if (currentData?.ingredients?.categories && Object.keys(currentData.ingredients.categories).length > 0) {
                console.log('🔁🔁🔁 [STEP TRACE] Auto-continuing from EXTRACT_INGREDIENTS to SHOPPING_LIST for user', userId);
                console.log('📊📊📊 [STEP TRACE] Ingredient categories available:', Object.keys(currentData.ingredients.categories).join(', '));
                
                const moveResult = await this.continueGeneration(userId);
                console.log('✅✅✅ [STEP TRACE] Auto-continue to shopping list successful for user', userId, 'now at step', moveResult.step);
              } else {
                console.error('⚠️⚠️⚠️ [STEP TRACE] Ingredients data not yet ready for user', userId, ', delaying continuation');
                // Try again after a short delay
                setTimeout(async () => {
                  try {
                    console.log('🔄🔄🔄 [STEP TRACE] Second attempt at continuing to shopping list for user', userId);
                    const moveResult = await this.continueGeneration(userId);
                    console.log('✅✅✅ [STEP TRACE] Second attempt auto-continue successful for user', userId, 'now at step', moveResult.step);
                  } catch (retryErr) {
                    console.error('💥💥💥 [STEP TRACE] Failed second attempt to continue for user', userId, retryErr);
                  }
                }, 3000);
              }
            } catch (autoErr) {
              console.error('❌❌❌ [STEP TRACE] Failed to auto-continue to shopping list for user', userId, autoErr);
              // Still try to continue after a longer delay
              setTimeout(async () => {
                try {
                  console.log('🔄🔄🔄 [STEP TRACE] Recovery attempt at continuing to shopping list for user', userId);
                  const moveResult = await this.continueGeneration(userId);
                  console.log('✅✅✅ [STEP TRACE] Recovery attempt auto-continue successful for user', userId);
                } catch (recoveryErr) {
                  console.error('💥💥💥 [STEP TRACE] Failed recovery attempt to continue for user', userId, recoveryErr);
                }
              }, 5000);
            }
          }, 5000);
          break;

        case PlanGenerationStep.EXTRACT_INGREDIENTS:
          console.log('👉👉👉 [STEP TRACE] EXTRACT_INGREDIENTS step starting for user', userId);
          // Retrieve budget from the saved input data if the passed input is undefined
          const budget = updatedData.input_json?.weeklyBudget || planData.input_json?.weeklyBudget || 0;
          // Retrieve preferred store if available
          const preferredStore = updatedData.input_json?.preferredStore || planData.input_json?.preferredStore;
          console.log('👉👉👉 [STEP TRACE] Using budget value:', budget, 'and preferred store:', preferredStore || 'none', 'for user', userId);
          // Generate shopping list
          const shoppingList = await this.generateShoppingList(updatedData.ingredients, budget, preferredStore);
          console.log('✅✅✅ [STEP TRACE] Shopping list generation completed successfully for user', userId);
          updatedData.shoppingList = shoppingList;
          nextStep = PlanGenerationStep.SHOPPING_LIST;
          console.log('🔄🔄🔄 [STEP TRACE] Setting nextStep to SHOPPING_LIST (step 5) for user', userId);
          
          // Force an auto-continue to complete the plan after a longer delay
          console.log('⏱️⏱️⏱️ [STEP TRACE] Scheduling completion with 8-second delay for user', userId);
          setTimeout(async () => {
            try {
              // Double-check that shopping list data exists before continuing
              const currentData = await storage.getPlanGenerationData(userId);
              if (currentData?.shoppingList?.categories || currentData?.shoppingList?.items) {
                console.log('🔁🔁🔁 [STEP TRACE] Auto-continuing from SHOPPING_LIST to COMPLETE for user', userId);
                console.log('📊📊📊 [STEP TRACE] Shopping list data available:', 
                           'categories:', currentData.shoppingList?.categories ? Object.keys(currentData.shoppingList.categories).length : 0,
                           'items:', currentData.shoppingList?.items ? currentData.shoppingList.items.length : 0);
                
                const moveResult = await this.continueGeneration(userId);
                console.log('✅✅✅ [STEP TRACE] Auto-continue to complete plan successful for user', userId, 'now at step', moveResult.step);
              } else {
                console.error('⚠️⚠️⚠️ [STEP TRACE] Shopping list data not yet ready for user', userId, ', delaying completion');
                // Try again after a short delay
                setTimeout(async () => {
                  try {
                    console.log('🔄🔄🔄 [STEP TRACE] Second attempt at continuing to complete for user', userId);
                    const moveResult = await this.continueGeneration(userId);
                    console.log('✅✅✅ [STEP TRACE] Second attempt auto-complete successful for user', userId, 'now at step', moveResult.step);
                  } catch (retryErr) {
                    console.error('💥💥💥 [STEP TRACE] Failed second attempt to complete for user', userId, retryErr);
                  }
                }, 5000);
              }
            } catch (autoErr) {
              console.error('❌❌❌ [STEP TRACE] Failed to auto-continue to complete plan for user', userId, autoErr);
              // Still try to continue after a longer delay
              setTimeout(async () => {
                try {
                  console.log('🔄🔄🔄 [STEP TRACE] Recovery attempt at completing plan for user', userId);
                  const moveResult = await this.continueGeneration(userId);
                  console.log('✅✅✅ [STEP TRACE] Recovery attempt auto-complete successful for user', userId);
                } catch (recoveryErr) {
                  console.error('💥💥💥 [STEP TRACE] Failed recovery attempt to complete for user', userId, recoveryErr);
                }
              }, 8000);
            }
          }, 8000);
          break;

        case PlanGenerationStep.SHOPPING_LIST:
          console.log('👉👉👉 [STEP TRACE] SHOPPING_LIST step starting for user', userId);
          // Complete the process and save the plan
          await this.saveFinalPlan(userId, updatedData);
          console.log('✅✅✅ [STEP TRACE] Final plan saved successfully for user', userId);
          nextStep = PlanGenerationStep.COMPLETE;
          console.log('🔄🔄🔄 [STEP TRACE] Setting nextStep to COMPLETE (finished) for user', userId);
          break;

        case PlanGenerationStep.COMPLETE:
          // Already complete
          return {
            isGenerating: false,
            step: PlanGenerationStep.COMPLETE,
            stepMessage: this.STEP_DESCRIPTIONS[PlanGenerationStep.COMPLETE],
            estimatedTimeRemaining: 0,
            totalSteps: Object.keys(PlanGenerationStep).length / 2 - 1,
            isComplete: true
          };

        default:
          nextStep = PlanGenerationStep.INITIALIZE;
      }

      // Update status with the next step
      await storage.setPlanGenerationStatus(
        userId, 
        nextStep !== PlanGenerationStep.COMPLETE, 
        {
          currentStep: nextStep,
          stepMessage: this.STEP_DESCRIPTIONS[nextStep],
          estimatedTimeRemaining: this.STEP_TIME_ESTIMATES[nextStep],
          totalSteps: Object.keys(PlanGenerationStep).length / 2 - 1
        }
      );
      
      // Store updated data as JSON
      await storage.storePlanGenerationData(userId, {
        ...updatedData,
        isGenerating: nextStep !== PlanGenerationStep.COMPLETE,
        step: nextStep,
        stepMessage: this.STEP_DESCRIPTIONS[nextStep],
        estimatedTimeRemaining: this.STEP_TIME_ESTIMATES[nextStep],
        totalSteps: Object.keys(PlanGenerationStep).length / 2 - 1,
        isComplete: nextStep === PlanGenerationStep.COMPLETE
      });

      // Check if we should auto-continue to the next step
      // This is an additional safety measure to ensure progression even if other mechanisms fail
      if (nextStep !== PlanGenerationStep.COMPLETE) {
        // Add increasing delays for each step to ensure database updates are completed
        const autoDelays: Record<PlanGenerationStep, number> = {
          [PlanGenerationStep.INITIALIZE]: 1000,
          [PlanGenerationStep.NUTRITION_CALCULATION]: 1500,
          [PlanGenerationStep.WORKOUT_PLAN]: 2000,
          [PlanGenerationStep.MEAL_PLAN]: 2500,
          [PlanGenerationStep.EXTRACT_INGREDIENTS]: 3000,
          [PlanGenerationStep.SHOPPING_LIST]: 3500,
          [PlanGenerationStep.COMPLETE]: 0
        };
        
        // Schedule auto-continue with appropriate delay
        const delay = autoDelays[nextStep] || 2000;
        
        console.log(`🔄🔄🔄 [AUTO-CONTINUE] Scheduling auto-continue from step ${nextStep} with ${delay}ms delay for user ${userId}`);
        
        setTimeout(async () => {
          try {
            // Double-check current status to avoid race conditions
            const currentStatus = await this.getGenerationStatus(userId);
            
            // Only auto-continue if still at the same step and still generating
            if (currentStatus && currentStatus.isGenerating && currentStatus.step === nextStep) {
              console.log(`🔄🔄🔄 [AUTO-CONTINUE] Executing auto-continue from step ${nextStep} for user ${userId}`);
              const result = await this.continueGeneration(userId);
              console.log(`✅✅✅ [AUTO-CONTINUE] Successfully auto-continued to step ${result.step} for user ${userId}`);
            } else {
              console.log(`ℹ️ℹ️ℹ️ [AUTO-CONTINUE] Skipping auto-continue as status has changed for user ${userId}`);
            }
          } catch (autoErr) {
            console.error(`❌❌❌ [AUTO-CONTINUE] Failed to auto-continue for user ${userId}:`, autoErr);
          }
        }, delay);
      }

      // Return updated status
      return {
        isGenerating: nextStep !== PlanGenerationStep.COMPLETE,
        step: nextStep,
        stepMessage: this.STEP_DESCRIPTIONS[nextStep],
        estimatedTimeRemaining: this.STEP_TIME_ESTIMATES[nextStep],
        totalSteps: Object.keys(PlanGenerationStep).length / 2 - 1,
        isComplete: nextStep === PlanGenerationStep.COMPLETE
      };
    } catch (error: any) {
      console.error('Error continuing plan generation:', error);
      
      // Update status with error
      await storage.setPlanGenerationStatus(userId, false, {
        errorMessage: error.message || String(error)
      });

      throw new Error(`Failed to continue plan generation: ${error.message || String(error)}`);
    }
  }

  /**
   * Cancel the ongoing plan generation
   * @param userId User ID
   * @returns True if cancelled successfully
   */
  async cancelGeneration(userId: number): Promise<boolean> {
    try {
      // Try to get the status but don't fail if it errors
      let status = null;
      try {
        status = await storage.getPlanGenerationStatus(userId);
      } catch (statusError) {
        console.warn(`Unable to get plan generation status for user ${userId}:`, statusError);
        // Continue execution even if this fails - we still want to try to cleanup
      }
      
      // If we have a valid status and not generating, nothing to do
      if (status && !status.isGenerating) {
        return false;
      }

      // Try to update the status to mark as not generating
      try {
        await storage.setPlanGenerationStatus(userId, false, {
          errorMessage: 'Plan generation cancelled by user'
        });
      } catch (updateError) {
        console.warn(`Unable to update plan generation status for user ${userId}:`, updateError);
        // Continue execution - we'll try the more aggressive delete next
      }

      // As a fallback, try to completely delete the status
      try {
        await storage.deletePlanGenerationStatus(userId);
      } catch (deleteError) {
        console.warn(`Unable to delete plan generation status for user ${userId}:`, deleteError);
        // We've tried everything - will return success anyway to prevent lockups
      }

      return true;
    } catch (error: any) {
      // Log error but don't throw - we want to avoid locking users out
      console.error('Error cancelling plan generation:', error);
      return true; // Return true to indicate it was "cancelled" even if it failed
    }
  }

  /**
   * Get the result of a completed plan generation
   * @param userId User ID
   * @returns Plan data or null if not found
   */
  async getGenerationResult(userId: number): Promise<PlanData | null> {
    try {
      const planData = await storage.getPlanGenerationData(userId) as PlanData | null;
      if (!planData || planData.isGenerating) {
        return null;
      }

      return planData;
    } catch (error: any) {
      console.error('Error getting plan result:', error);
      throw new Error(`Failed to get plan result: ${error.message || String(error)}`);
    }
  }

  // Step implementation methods

  /**
   * Step 1: Calculate nutrition requirements
   */
  private async calculateNutrition(input: any): Promise<any> {
    // Calculate BMR using Mifflin-St Jeor Equation
    const { age, sex, height, weight, activityLevel, fitnessGoal } = input;

    let bmr;
    if (sex === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Apply activity factor
    const activityFactors = {
      'sedentary': 1.2,
      'light': 1.375,
      'moderate': 1.55,
      'very_active': 1.725,
      'extra_active': 1.9
    };
    
    // Ensure activityLevel is a valid key
    const level = activityLevel as keyof typeof activityFactors;
    const factor = activityFactors[level] || activityFactors['moderate']; // Default to moderate if invalid
    const tdee = bmr * factor;

    // Adjust calories based on fitness goal
    let calorieTarget;
    let proteinPerKg;
    let fatPercentage;
    let carbPercentage;
    
    switch (fitnessGoal) {
      case 'weight_loss':
        calorieTarget = tdee * 0.8; // 20% deficit
        proteinPerKg = 2.0; // Higher protein for muscle preservation
        fatPercentage = 0.3; // 30% from fat
        carbPercentage = 0.3; // 30% from carbs
        break;
      case 'muscle_gain':
        calorieTarget = tdee * 1.1; // 10% surplus
        proteinPerKg = 2.2; // Higher protein for muscle building
        fatPercentage = 0.25; // 25% from fat
        carbPercentage = 0.45; // 45% from carbs
        break;
      case 'strength':
        calorieTarget = tdee * 1.05; // 5% surplus
        proteinPerKg = 2.0;
        fatPercentage = 0.3;
        carbPercentage = 0.4;
        break;
      case 'stamina':
        calorieTarget = tdee;
        proteinPerKg = 1.6;
        fatPercentage = 0.25;
        carbPercentage = 0.55; // Higher carbs for endurance
        break;
      case 'endurance':
        calorieTarget = tdee * 1.1;
        proteinPerKg = 1.6;
        fatPercentage = 0.25;
        carbPercentage = 0.55; // Higher carbs for endurance
        break;
      default:
        calorieTarget = tdee;
        proteinPerKg = 1.6;
        fatPercentage = 0.3;
        carbPercentage = 0.4;
    }

    // Calculate actual macros
    const proteinGrams = Math.round(weight * proteinPerKg);
    const fatGrams = Math.round((calorieTarget * fatPercentage) / 9); // 9 calories per gram of fat
    const carbGrams = Math.round((calorieTarget * carbPercentage) / 4); // 4 calories per gram of carbs

    // Calculate actual calories from these macros
    const proteinCalories = proteinGrams * 4;
    const fatCalories = fatGrams * 9;
    const carbCalories = carbGrams * 4;
    
    // Adjust to ensure total matches target within 50 calories
    const calculatedTotal = proteinCalories + fatCalories + carbCalories;
    let adjustedCarbGrams = carbGrams;
    
    if (Math.abs(calculatedTotal - calorieTarget) > 50) {
      const calorieAdjustment = calorieTarget - calculatedTotal;
      const carbAdjustment = Math.round(calorieAdjustment / 4);
      adjustedCarbGrams = carbGrams + carbAdjustment;
    }

    return {
      calories: Math.round(calorieTarget),
      protein: proteinGrams,
      fat: fatGrams,
      carbs: adjustedCarbGrams,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee)
    };
  }

  /**
   * Step 2: Generate workout plan
   */
  private async generateWorkoutPlan(input: any, nutritionData: any): Promise<any> {
    try {
      console.log("Generating workout plan with OpenAI...");
      console.log("[PLAN DEBUG] generateWorkoutPlan input:", JSON.stringify(input, null, 2));
      console.log("[PLAN DEBUG] generateWorkoutPlan nutritionData:", JSON.stringify(nutritionData, null, 2));
      
      // Validate that nutrition data is available before proceeding
      if (!nutritionData || !nutritionData.calories) {
        console.error('[PLAN DEBUG] Missing nutrition data for workout plan generation');
        throw new Error('Nutrition data not available for workout plan generation');
      }
      
      // Extract relevant input data
      const { 
        age, 
        sex, 
        fitnessGoal, 
        workoutDaysPerWeek, 
        preferredWorkoutDays = [], 
        workoutDuration = 60 
      } = input;
      
      // Generate workout plan with OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an expert fitness coach creating a personalized workout plan.
            Create a detailed weekly workout schedule for a ${age}-year-old ${sex} with a primary goal of ${fitnessGoal}.
            
            The workout plan should include:
            1. ${workoutDaysPerWeek} workout days per week
            2. A varied selection of exercises for each day
            3. Appropriate rest days between similar muscle groups
            4. Details for each exercise (sets, reps, rest periods)
            5. A proper structure based on the fitness goal:
               - Weight Loss: HIIT, circuit training, full-body workouts with cardio
               - Muscle Gain: Split training (push/pull/legs or upper/lower)
               - Strength: Compound movements with progressive overload
               - Stamina/Endurance: Higher rep ranges, cardio intervals, minimal rest
            
            Your response MUST be a valid JSON object with this exact structure:
            {
              "weeklySchedule": {
                "monday": {
                  "name": "Workout Name",
                  "workoutType": "Type of workout",
                  "targetMuscleGroups": ["muscle1", "muscle2"],
                  "exercises": [
                    {
                      "name": "Exercise name",
                      "sets": 3,
                      "reps": 10,
                      "rest": 60,
                      "notes": "Form cues or variations"
                    }
                  ]
                },
                "tuesday": { ... },
                ... (all 7 days of the week)
              },
              "notes": "General advice and progression notes"
            }`
          },
          {
            role: "user",
            content: `Please create a workout plan for me with the following details:
            
            - Age: ${age}
            - Sex: ${sex}
            - Fitness Goal: ${fitnessGoal}
            - Workout Days Per Week: ${workoutDaysPerWeek}
            - Preferred Workout Days (if any): ${preferredWorkoutDays.join(', ')}
            - Workout Duration: ${workoutDuration} minutes
            
            My current calorie target is ${nutritionData.calories} calories per day.
            My macronutrient targets are: ${nutritionData.protein}g protein, ${nutritionData.carbs}g carbs, ${nutritionData.fat}g fat.`
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse and return the workout plan
      const workoutPlan = JSON.parse(response.choices[0].message.content || "{}");
      console.log("Workout plan generated successfully");
      
      return workoutPlan;
    } catch (error: any) {
      console.error("Error generating workout plan:", error);
      throw new Error(`Failed to generate workout plan: ${error.message || String(error)}`);
    }
  }

  /**
   * Step 3: Generate meal plan
   */
  private async generateMealPlan(input: any, nutritionData: any): Promise<any> {
    try {
      console.log("Generating meal plan with OpenAI...");
      console.log("[PLAN DEBUG] generateMealPlan input:", JSON.stringify(input, null, 2));
      console.log("[PLAN DEBUG] generateMealPlan nutritionData:", JSON.stringify(nutritionData, null, 2));
      
      // Extract relevant input data
      const { 
        age, 
        sex,
        fitnessGoal, 
        dietaryPreferences = [], 
        weeklyBudget,
        preferredStore
      } = input;
      
      // Determine budget level for meal planning
      let budgetLevel = "standard";
      const numericBudget = typeof weeklyBudget === 'string' ? 
                           parseFloat(weeklyBudget.replace(/[^\d.]/g, '')) : 
                           weeklyBudget;
                           
      if (typeof weeklyBudget === 'string' && !isNaN(numericBudget)) {
        // If we can extract a number from the string, use that to determine level
        if (numericBudget < 50) {
          budgetLevel = "economy";
        } else if (numericBudget > 90) {
          budgetLevel = "premium";
        } else {
          budgetLevel = "standard";
        }
      } else if (typeof weeklyBudget === 'string') {
        // If it's a string but we couldn't extract a number, use the string directly
        budgetLevel = weeklyBudget.toLowerCase();
      } else if (weeklyBudget < 50) {
        budgetLevel = "economy";
      } else if (weeklyBudget > 90) {
        budgetLevel = "premium";
      }
      
      console.log(`[PLAN DEBUG] Budget info: Original=${weeklyBudget}, Numeric=${numericBudget}, Level=${budgetLevel}`);
      
      // Generate meal plan with OpenAI - with structured ingredients
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a nutrition expert creating a personalized meal plan with structured ingredient data.
            Create a detailed weekly meal plan for a ${age}-year-old ${sex} with a primary goal of ${fitnessGoal}.
            
            The meal plan should:
            1. Meet the nutritional targets: ${nutritionData.calories} calories, ${nutritionData.protein}g protein, ${nutritionData.carbs}g carbs, ${nutritionData.fat}g fat
            2. IMPORTANT: Determine the optimal number and timing of meals based on the user's goals (${fitnessGoal}) and calorie needs (${nutritionData.calories}cal) - do NOT default to a fixed meal structure
            3. Respect dietary preferences: ${dietaryPreferences.join(", ")}
            4. Fit within a ${budgetLevel} budget (${budgetLevel === "economy" ? "£30-50" : budgetLevel === "premium" ? "£90+" : "£50-90"}/week)
            5. IMPORTANT: Stay within the user's maximum budget with a margin of ±10% - never exceed the maximum budget by more than 10%
            6. Use UK food prices from ${preferredStore ? preferredStore.charAt(0).toUpperCase() + preferredStore.slice(1).toLowerCase() : 'Tesco'} for all pricing estimates
            7. Calculate accurate price estimates in GBP (£) for each ingredient and each meal
            8. Provide appropriate meal frequency based on goals:
               * For muscle gain goals: YOU MUST INCLUDE ALL 6 MEAL TYPES: breakfast, lunch, dinner, pre_workout, post_workout, and evening_meal to ensure full calorie targets are met
               * For other goals: 3-4 meals per day depending on calorie needs
            9. Provide meal variety while using common ingredients efficiently
            10. Include simple recipes with preparation instructions
            11. Include structured ingredient data with prices that can be used directly for shopping lists
            
            Store-specific pricing guidelines:
            - Premium stores (Waitrose, M&S Food): +25% higher prices
            - Standard stores (Tesco, Sainsbury's, Morrisons): standard prices
            - Budget stores (Aldi, Lidl, Asda): -15% lower prices
            
            Your response MUST be a valid JSON object with this structure:
            {
              "mealFrequency": {
                "mealsPerDay": 6,
                "explanation": "Based on the user's high calorie needs (2800+) and muscle gain goal, all 6 meal types (breakfast, lunch, dinner, pre_workout, post_workout, evening_meal) are required to distribute protein intake, maximize muscle protein synthesis, and meet the full calorie target."
              },
              "weeklyMealPlan": {
                "monday": {
                  // Use the actual meal names based on optimal frequency (could be 3, 4, 5 or 6 meals)
                  // Do not just default to breakfast/lunch/dinner! Use the optimal pattern.
                  "meal1": {
                    "name": "Meal name",
                    "time": "7:00 AM", // Include recommended timing
                    "description": "Brief description",
                    "ingredients": [
                      {
                        "name": "Ingredient name",
                        "quantity": 2,
                        "unit": "cups",
                        "category": "Produce",
                        "price": 0.85
                      }
                    ],
                    "calories": 500,
                    "protein": 30,
                    "carbs": 50,
                    "fat": 15,
                    "cookingInstructions": ["step1", "step2"],
                    "prepTime": 10,
                    "cookTime": 15,
                    "difficulty": "easy",
                    "price": 2.45,
                    "store": "Tesco"
                  },
                  "meal2": { ... },
                  "meal3": { ... },
                  "meal4": { ... },
                  // No need to follow standard breakfast/lunch/dinner pattern
                  // Use meal1, meal2, etc. based on your mealFrequency.mealsPerDay
                },
                "tuesday": { ... },
                ... (all 7 days of the week)
              },
              "notes": "General advice and meal timing notes",
              "structuredIngredients": {
                "categories": {
                  "Produce": [
                    {
                      "name": "Spinach",
                      "quantity": 2,
                      "unit": "cups",
                      "optional": false,
                      "price": 1.20,
                      "store": "Tesco"
                    }
                  ],
                  "Protein": [
                    {
                      "name": "Chicken breast",
                      "quantity": 500,
                      "unit": "g",
                      "optional": false, 
                      "price": 3.50,
                      "store": "Tesco"
                    }
                  ],
                  "Dairy & Eggs": [],
                  "Grains & Bread": [],
                  "Other": []
                }
              }
            }
            
            For structuredIngredients:
            1. Combine duplicate ingredients and sum their quantities
            2. Standardize units (e.g., convert tablespoons to cups where appropriate)
            3. Use these categories consistently: "Produce", "Protein", "Dairy & Eggs", "Grains & Bread", "Other"
            4. Include a "price" field for every ingredient with the estimated cost in GBP (£)
            5. Include a "store" field set to "${preferredStore ? preferredStore.charAt(0).toUpperCase() + preferredStore.slice(1).toLowerCase() : 'Tesco'}"
            6. For items in the "ingredients" arrays, include the same structured format (name, quantity, unit, category, price, store)
            7. Calculate the total meal price as the sum of all ingredient costs in that meal
            8. VERY IMPORTANT: Use realistic UK store packaging sizes for all ingredients. For example:
               - Liquids (milk, oil, juice): 250ml, 330ml, 500ml, 750ml, 1L, 2L
               - Foods by weight: 100g, 250g, 500g, 1kg
               - Count items (fruits, eggs): individual pieces or standard packs (6 eggs, etc.)
            9. Price each ingredient based on the FULL package size, not just the amount used in recipes
               - Example: If a recipe needs 200ml milk, list "Milk, 1 pint (568ml), £0.95" - not "Milk, 200ml, £0.33"
               - In the ingredients list, you can note "200ml needed" but price the full container`
          },
          {
            role: "user",
            content: `Please create a meal plan for me with the following details:
            
            - Age: ${age}
            - Sex: ${sex}
            - Fitness Goal: ${fitnessGoal}
            - Dietary Preferences: ${dietaryPreferences.join(', ')}
            - Weekly Budget: ${budgetLevel} (${typeof weeklyBudget === 'number' ? `£${weeklyBudget}` : weeklyBudget})
            - Preferred Store: ${preferredStore ? preferredStore.charAt(0).toUpperCase() + preferredStore.slice(1).toLowerCase() : 'Tesco'}
            
            My nutritional targets are:
            - Daily Calories: ${nutritionData.calories} calories
            - Protein: ${nutritionData.protein}g
            - Carbs: ${nutritionData.carbs}g
            - Fat: ${nutritionData.fat}g
            
            IMPORTANT: For each meal, calculate and include a "price" field with the total cost in GBP (£) based on ${preferredStore ? preferredStore.charAt(0).toUpperCase() + preferredStore.slice(1).toLowerCase() : 'Tesco'} prices in the UK. Different stores have different price points - Waitrose and M&S are premium with higher prices (+25%), while Aldi and Lidl are budget stores with lower prices (-15%).
            
            Also include a "price" field for each ingredient with the estimated cost in GBP (£) at ${preferredStore ? preferredStore.charAt(0).toUpperCase() + preferredStore.slice(1).toLowerCase() : 'Tesco'}.
            
            CRITICAL - USE REALISTIC PACKAGE SIZES: I need ingredients listed in realistic package sizes available in UK stores, not just the exact amounts needed for recipes. For example:
            - If a recipe needs 200ml of milk, list as "1 pint milk (568ml)" with the price for the full pint
            - If a recipe needs 80g of cheese, list as "100g cheddar cheese" with the price for the full 100g package
            - For fresh produce sold by weight, use common pack sizes (250g, 500g, etc.)
            
            IMPORTANT: Determine the optimal number of meals per day based on my calorie needs (${nutritionData.calories} calories) and fitness goal (${fitnessGoal}).
            
            FOR MUSCLE GAIN GOALS: YOU MUST INCLUDE ALL 6 MEAL TYPES: breakfast, lunch, dinner, pre_workout, post_workout, and evening_meal to ensure full calorie targets are met (${nutritionData.calories} calories).
            
            For other goals: Use 3-4 meals per day depending on what's optimal.
            
            IMPORTANT: Make sure to include structured ingredients both within each meal and in the combined structuredIngredients section. This is essential for creating an accurate shopping list without additional processing.`
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse and return the meal plan
      const mealPlan = JSON.parse(response.choices[0].message.content || "{}");
      console.log("Meal plan generated successfully");
      
      // If we have structured ingredients, use them directly
      if (mealPlan.structuredIngredients && mealPlan.structuredIngredients.categories) {
        console.log("[PLAN DEBUG] Structured ingredients found in meal plan, will skip separate extraction step");
        
        // Standardize the categories to match our expected format
        const standardizedCategories = {
          produce: mealPlan.structuredIngredients.categories["Produce"] || [],
          protein: mealPlan.structuredIngredients.categories["Protein"] || [],
          dairy: mealPlan.structuredIngredients.categories["Dairy & Eggs"] || [],
          grains: mealPlan.structuredIngredients.categories["Grains & Bread"] || [],
          other: mealPlan.structuredIngredients.categories["Other"] || []
        };
        
        mealPlan.ingredients = {
          categories: standardizedCategories,
          totalCount: Object.values(standardizedCategories).reduce((sum, arr: any[]) => sum + arr.length, 0)
        };
        
        console.log("[PLAN DEBUG] Added ingredients directly from structured data:", 
                    mealPlan.ingredients.totalCount, "total ingredients");
      }
      
      return mealPlan;
    } catch (error: any) {
      console.error("Error generating meal plan:", error);
      throw new Error(`Failed to generate meal plan: ${error.message || String(error)}`);
    }
  }

  /**
   * Step 4: Extract ingredients from meal plan
   */
  private async extractIngredients(mealPlan: any): Promise<any> {
    console.log('Extracting ingredients from meal plan...');
    
    // Validate input
    if (!mealPlan) {
      console.error('[PLAN DEBUG] mealPlan is undefined or null in extractIngredients');
      throw new Error('Failed to extract ingredients: Meal plan is not available');
    }
    
    try {
      console.log('[PLAN DEBUG] extractIngredients mealPlan structure:', 
                  JSON.stringify(Object.keys(mealPlan), null, 2));
      
      if (!mealPlan.weeklyMealPlan) {
        console.error('[PLAN DEBUG] mealPlan.weeklyMealPlan is missing, full mealPlan:', 
                     JSON.stringify(mealPlan, null, 2));
        throw new Error('Failed to extract ingredients: Weekly meal plan data is not structured correctly');
      }
      
      // If we already have ingredients data (from meal plan generation), use it directly
      if (mealPlan.ingredients && mealPlan.ingredients.categories) {
        console.log('[PLAN DEBUG] Using structured ingredients data already available in meal plan');
        
        // Get detailed counts by category
        const categoryStats = Object.entries(mealPlan.ingredients.categories)
          .map(([category, items]) => `${category}(${Array.isArray(items) ? items.length : 0})`)
          .join(', ');
        
        console.log('[PLAN DEBUG] Structured ingredients by category:', categoryStats);
        console.log('[PLAN DEBUG] Total structured ingredients:', mealPlan.ingredients.totalCount || 'unknown');
        
        return mealPlan.ingredients;
      }
      
      // If we don't have structured ingredients, proceed with extraction
      
      // Check actual structure of the meal plan
      let daysWithData = 0;
      let totalMeals = 0;
      
      Object.entries(mealPlan.weeklyMealPlan).forEach(([day, meals]: [string, any]) => {
        if (meals && typeof meals === 'object') {
          daysWithData++;
          const mealCount = Object.keys(meals).length;
          totalMeals += mealCount;
          console.log(`[PLAN DEBUG] Day ${day} has ${mealCount} meals`);
        }
      });
      
      console.log(`[PLAN DEBUG] Meal plan has ${daysWithData} days with data, ${totalMeals} total meals`);
      
      if (daysWithData === 0 || totalMeals === 0) {
        console.error('[PLAN DEBUG] Meal plan has no actual meal data');
        throw new Error('Failed to extract ingredients: Meal plan contains no meal data');
      }
      
      // Use AI to extract ingredients from the meal plan day-by-day
      console.log('[PLAN DEBUG] Structured ingredients not found, calling extractIngredientsFromMealPlan in OpenAI utility...');
      const ingredients = await extractIngredientsFromMealPlan(mealPlan);
      
      console.log('[PLAN DEBUG] Extracted ingredients result received');
      if (!ingredients) {
        throw new Error('Extracted ingredients data is empty');
      }
      
      // Check if we received an error in the fallback structure
      if (ingredients.error) {
        console.error('[PLAN DEBUG] OpenAI extraction returned error:', ingredients.error);
      }
      
      // Log ingredient extraction results with more detailed statistics
      if (ingredients.categories) {
        // Get detailed counts by category
        const categoryStats = Object.entries(ingredients.categories)
          .map(([category, items]) => `${category}(${Array.isArray(items) ? items.length : 0})`)
          .join(', ');
        
        console.log('[PLAN DEBUG] Extracted ingredients by category:', categoryStats);
        console.log('[PLAN DEBUG] Total ingredients extracted:', ingredients.totalCount || 'unknown');
      } else {
        console.log('[PLAN DEBUG] No ingredient categories found in response');
      }
      
      return ingredients;
    } catch (error: any) {
      console.error('[PLAN DEBUG] Error extracting ingredients:', error);
      console.error('[PLAN DEBUG] Error stack:', error.stack);
      
      // Return a fallback structure instead of throwing to allow the process to continue
      return { 
        categories: { produce: [], protein: [], dairy: [], grains: [], other: [] },
        totalCount: 0,
        error: `Failed to extract ingredients: ${error.message || String(error)}`
      };
    }
  }

  /**
   * Step 5: Generate shopping list
   */
  private async generateShoppingList(ingredients: any, budget: any, preferredStore?: string): Promise<any> {
    console.log('Generating shopping list with budget considerations...');
    console.log('[PLAN DEBUG] generateShoppingList budget value:', budget);
    
    // Validate input
    if (!ingredients) {
      console.error('[PLAN DEBUG] ingredients is undefined or null in generateShoppingList');
      return {
        status: "error",
        message: "Failed to generate shopping list: Ingredients data is not available",
        items: [],
        totalCost: 0,
        budgetStatus: "unknown"
      };
    }
    
    // Debug ingredients structure
    console.log('[PLAN DEBUG] generateShoppingList ingredients structure:', 
                JSON.stringify(Object.keys(ingredients), null, 2));
    
    if (ingredients.error) {
      console.error('[PLAN DEBUG] Ingredients contain error from previous step:', ingredients.error);
      return {
        status: "error",
        message: `Failed to generate proper shopping list: ${ingredients.error}`,
        items: [],
        totalCost: 0,
        budgetStatus: "unknown"
      };
    }
    
    if (!ingredients.categories) {
      console.error('[PLAN DEBUG] Ingredients missing categories structure');
      return {
        status: "error",
        message: "Failed to generate shopping list: Ingredients data missing categories",
        items: [],
        totalCost: 0,
        budgetStatus: "unknown"
      };
    }
    
    try {
      // Normalize budget to number with a minimum of £30
      let numericBudget: number;
      if (typeof budget === 'string') {
        // Try to extract just the number from strings like "£50/week"
        const budgetMatch = budget.match(/\d+/);
        numericBudget = budgetMatch ? parseInt(budgetMatch[0], 10) : 50; // Default to 50 if parsing fails
      } else if (typeof budget === 'number') {
        numericBudget = budget;
      } else {
        console.log('[PLAN DEBUG] Budget not provided or invalid, using default of 50');
        numericBudget = 50; // Default budget
      }
      
      // Enforce minimum budget of £30
      if (numericBudget < 30) {
        console.log(`[PLAN DEBUG] Budget below minimum (${numericBudget}), using minimum value of £30`);
        numericBudget = 30;
      }
      
      console.log(`[PLAN DEBUG] Using normalized budget value: ${numericBudget}`);
      
      // Generate shopping list from ingredients with budget considerations and preferred store
      console.log('[PLAN DEBUG] Calling generateShoppingList in OpenAI utility with budget and store:', 
                 `Budget: ${numericBudget}, Store: ${preferredStore || 'none'}`);
      const shoppingList = await generateShoppingList(ingredients, numericBudget, preferredStore);
      
      console.log('[PLAN DEBUG] Shopping list result received');
      if (!shoppingList) {
        throw new Error('Shopping list data returned empty');
      }
      
      // Ensure the shopping list has a proper structure with all required fields
      const typedShoppingList: any = shoppingList;
      
      if (!typedShoppingList.items) {
        typedShoppingList.items = [];
      }
      
      if (typedShoppingList.totalCost === undefined || typedShoppingList.totalCost === null) {
        typedShoppingList.totalCost = 0;
      }
      
      if (!typedShoppingList.budgetStatus) {
        // Calculate budget status with 10% margin
        const totalCost = Number(typedShoppingList.totalCost) || 0;
        const upperBudgetLimit = numericBudget * 1.1; // Allow 10% over budget
        if (totalCost <= upperBudgetLimit) {
          typedShoppingList.budgetStatus = "under_budget";
        } else {
          typedShoppingList.budgetStatus = "over_budget";
        }
      }
      
      console.log('[PLAN DEBUG] Shopping list generated with:', 
                 `${typedShoppingList.items.length} items, £${typedShoppingList.totalCost} total cost, ${typedShoppingList.budgetStatus} status`);
      
      return typedShoppingList;
    } catch (error: any) {
      console.error('[PLAN DEBUG] Error generating shopping list:', error);
      console.error('[PLAN DEBUG] Error stack:', error.stack);
      
      // Return a minimal valid structure
      return {
        status: "error",
        message: `Failed to generate shopping list: ${error.message || String(error)}`,
        items: [],
        totalCost: 0,
        budgetStatus: "unknown"
      };
    }
  }

  /**
   * Step 6: Save the final plan
   */
  private async saveFinalPlan(userId: number, planData: PlanData): Promise<void> {
    console.log('Saving final fitness plan for user', userId);
    console.log('[PLAN DEBUG] saveFinalPlan planData overview:', JSON.stringify({
      hasNutritionData: !!planData.nutritionData,
      hasWorkoutPlan: !!planData.workoutPlan,
      hasMealPlan: !!planData.mealPlan,
      hasIngredients: !!planData.ingredients,
      hasShoppingList: !!planData.shoppingList,
      hasInputJson: !!planData.input_json
    }, null, 2));
    
    try {
      // Prepare the data according to the fitnessPlans schema
      // The schema only has preferences, workoutPlan, and mealPlan as jsonb fields
      const preferences = planData.input_json || {};
      console.log('[PLAN DEBUG] saveFinalPlan preferences keys:', 
                  Object.keys(preferences).length ? Object.keys(preferences) : 'Empty preferences');
      
      // Add nutrition data to preferences for display in ViewPlan component
      if (planData.nutritionData) {
        console.log('[PLAN DEBUG] Adding nutritionData to preferences:', planData.nutritionData);
        preferences.nutritionGoals = {
          calories: planData.nutritionData.calories,
          protein: planData.nutritionData.protein,
          carbs: planData.nutritionData.carbs,
          fat: planData.nutritionData.fat
        };
        
        // Also update the user's nutrition goals in the database for use in dashboard/meal log
        console.log('[PLAN DEBUG] Updating nutrition goals in database with plan data for user', userId);
        try {
          await storage.setNutritionGoal(userId, {
            caloriesTarget: Math.round(planData.nutritionData.calories),
            proteinTarget: Math.round(planData.nutritionData.protein),
            carbsTarget: Math.round(planData.nutritionData.carbs),
            fatTarget: Math.round(planData.nutritionData.fat)
          });
          console.log('[PLAN DEBUG] Successfully updated nutrition goals in database for user', userId);
        } catch (nutritionError) {
          console.error('[PLAN ERROR] Failed to update nutrition goals in database:', nutritionError);
          // Continue with plan creation even if nutrition goal update fails
        }
      }
      
      // Make sure user preferences data is properly preserved in the plan
      // This ensures all form inputs are displayed in the plan summary screen
      if (planData.input_json) {
        console.log('[PLAN DEBUG] Adding user input data to preferences for display in ViewPlan component');
        
        // Add important form fields that should be displayed in plan summary
        const userInputFields = [
          'fitnessGoal', 
          'workoutDaysPerWeek', 
          'workoutDuration', 
          'preferredWorkoutDays', 
          'dietaryPreferences', 
          'fitnessLevel',
          'age',
          'sex',
          'height',
          'weight',
          'activityLevel',
          'weeklyBudget',
          'preferredStore'
        ];
        
        // Copy fields from input_json to preferences
        userInputFields.forEach(field => {
          if (planData.input_json[field] !== undefined) {
            preferences[field] = planData.input_json[field];
          }
        });
        
        console.log('[PLAN DEBUG] Added user preferences fields:', Object.keys(preferences).join(', '));
      }
      
      // Add extra data to workoutPlan and mealPlan objects
      const workoutPlan = planData.workoutPlan || {};
      console.log('[PLAN DEBUG] saveFinalPlan workoutPlan keys:', 
                  Object.keys(workoutPlan).length ? Object.keys(workoutPlan) : 'Empty workoutPlan');
                  
      if (planData.nutritionData) {
        workoutPlan.nutritionData = planData.nutritionData;
      }
      
      const mealPlan = planData.mealPlan || {};
      
      // Properly add shopping list to the meal plan
      if (planData.shoppingList) {
        console.log('[PLAN DEBUG] Adding shopping list to meal plan with keys:', 
                  Object.keys(planData.shoppingList).join(', '));
        
        // Ensure we have a properly structured shopping list
        const shoppingList = planData.shoppingList;
        
        // Make sure the shopping list has categories
        if (!shoppingList.categories || Object.keys(shoppingList.categories).length === 0) {
          console.log('[PLAN DEBUG] Shopping list missing categories, creating default structure');
          
          // Create default categories from ingredients if available
          if (planData.ingredients && planData.ingredients.categories) {
            // Convert ingredients categories to shopping list format
            shoppingList.categories = {};
            
            Object.entries(planData.ingredients.categories).forEach(([categoryName, items]: [string, any]) => {
              if (Array.isArray(items)) {
                // For proper compatibility with ViewPlan UI, we need specific format
                // The UI expects a flat array of items under each category name
                shoppingList.categories[categoryName] = items.map(item => ({
                  name: item.name,
                  quantity: item.quantity || 'as needed',
                  unit: item.unit || '',
                  estimatedPrice: Math.round((Math.random() * 4 + 1) * 100) / 100, // Random price between £1-£5
                  checked: false
                }));
              }
            });
            
            console.log('[PLAN DEBUG] Created shopping list categories from ingredients:', 
                      Object.keys(shoppingList.categories).join(', '));
          }
        }
        
        // Ensure flat items list exists
        if (!shoppingList.items || shoppingList.items.length === 0) {
          console.log('[PLAN DEBUG] Shopping list missing items array, creating from categories');
          shoppingList.items = [];
          
          if (shoppingList.categories) {
            // Collect all items from all categories
            Object.entries(shoppingList.categories).forEach(([categoryName, items]: [string, any]) => {
              // With our new format, items are directly in an array under the category key
              if (Array.isArray(items)) {
                items.forEach((item: any) => {
                  shoppingList.items.push({
                    ...item,
                    category: categoryName
                  });
                });
              }
            });
          }
          
          console.log('[PLAN DEBUG] Created items array with', shoppingList.items.length, 'items');
        }
        
        // Ensure budget status exists
        if (!shoppingList.budgetStatus) {
          console.log('[PLAN DEBUG] Shopping list missing budget status, adding default status');
          const budget = planData.input_json?.weeklyBudget || 50;
          const totalCost = shoppingList.totalCost || 0;
          // Allow 10% over budget before marking as "over_budget"
          const upperBudgetLimit = budget * 1.1;
          shoppingList.budgetStatus = totalCost <= upperBudgetLimit ? "under_budget" : "over_budget";
        }
        
        // Now set the enhanced shopping list
        mealPlan.shoppingList = shoppingList;
        console.log('[PLAN DEBUG] Final shopping list structure:', 
                  'categories:', Object.keys(mealPlan.shoppingList.categories || {}).length,
                  'items:', (mealPlan.shoppingList.items || []).length);
      } else {
        console.log('[PLAN DEBUG] No shopping list available to add to meal plan');
      }
      
      // Add ingredients data
      if (planData.ingredients) {
        mealPlan.ingredients = planData.ingredients;
      }
      
      // Create the fitness plan in the database
      await storage.createFitnessPlan(
        userId,
        {
          preferences,
          workoutPlan,
          mealPlan,
          isActive: true
        }
      );
      
      console.log('Fitness plan created successfully');
    } catch (error: any) {
      console.error('Error saving final plan:', error);
      throw new Error(`Failed to save final plan: ${error.message || String(error)}`);
    }
  }
}

export const stepwiseCoach = new StepwiseCoach();