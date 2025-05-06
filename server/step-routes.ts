/**
 * Step-by-step fitness plan generation routes
 * This file contains the routes for the step-wise coach approach
 * which breaks down the plan generation into smaller steps to prevent timeouts
 */

import { Router } from 'express';
import { storage } from './storage';
import { stepwiseCoach } from './stepwise-coach';
import { z } from 'zod';

const router = Router();

// Input validation schema
const planInputSchema = z.object({
  age: z.number().min(16).max(100),
  sex: z.enum(['male', 'female']),
  height: z.number().min(100).max(250), // in cm
  weight: z.number().min(30).max(250), // in kg
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very_active', 'extra_active']),
  fitnessGoal: z.enum(['weight_loss', 'muscle_gain', 'strength', 'stamina', 'endurance']),
  dietaryPreferences: z.array(z.string()),
  weeklyBudget: z.union([z.number(), z.string()]),
  workoutDaysPerWeek: z.number().min(1).max(7),
  preferredWorkoutDays: z.array(z.string()).optional(),
  workoutDuration: z.number().optional(),
  workoutNames: z.record(z.string()).optional(),
  notifyByEmail: z.boolean().optional(),
  email: z.string().email().optional(),
  location: z.string().optional()
});

// Define the step types
enum PlanGenerationStep {
  INITIALIZE = 0,
  NUTRITION_CALCULATION = 1,
  WORKOUT_PLAN = 2,
  MEAL_PLAN = 3, 
  EXTRACT_INGREDIENTS = 4,
  SHOPPING_LIST = 5,
  COMPLETE = 6
}

/**
 * Route to start the step-by-step plan generation process
 * POST /api/step-coach/start
 */
router.post('/start', async (req, res) => {
  console.log('[STEP DEBUG] Received plan generation start request');
  console.log('[STEP DEBUG] Authentication status:', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    userId: req.user?.id,
    requestHasCookies: !!req.headers.cookie,
    cookieLength: req.headers.cookie?.length || 0
  });
  
  if (!req.isAuthenticated()) {
    console.log('[STEP DEBUG] Authentication failed for plan generation request');
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  console.log('[STEP DEBUG] Request authenticated as user ID:', req.user.id);

  try {
    console.log('[PLAN DEBUG] Starting plan generation with body:', JSON.stringify(req.body, null, 2));
    
    // Validate the input
    const inputValidation = planInputSchema.safeParse(req.body);
    if (!inputValidation.success) {
      console.log('[PLAN DEBUG] Input validation failed:', JSON.stringify(inputValidation.error.errors, null, 2));
      return res.status(400).json({
        message: 'Invalid input data',
        errors: inputValidation.error.errors
      });
    }

    const input = inputValidation.data;
    console.log('[PLAN DEBUG] Validated input data:', JSON.stringify(input, null, 2));
    
    const userId = req.user.id;
    console.log(`[PLAN DEBUG] Starting plan generation for user ID: ${userId}`);
    
    // First, check if there's any abandoned status data that needs to be cleared
    try {
      console.log(`[PLAN DEBUG] Checking for and removing any existing plan generation status for user ${userId}`);
      
      // Use the modified clearPlanGenerationStatus method to completely delete the status
      const wasCleared = await storage.clearPlanGenerationStatus(userId);
      console.log(`[PLAN DEBUG] Plan generation status cleanup for user ${userId}: ${wasCleared ? 'Removed existing status' : 'No status found to clear'}`);
      
      // Also check if there are any active plans that need to be deactivated
      const activePlan = await storage.getActiveFitnessPlan(userId);
      if (activePlan) {
        console.log(`[PLAN DEBUG] Found active plan ${activePlan.id} that needs to be deactivated before starting a new one`);
        await storage.deactivateFitnessPlan(activePlan.id);
        console.log(`[PLAN DEBUG] Successfully deactivated plan ${activePlan.id}`);
      }
    } catch (cleanupError) {
      console.error(`[PLAN DEBUG] Error during pre-generation cleanup for user ${userId}:`, cleanupError);
      // Continue with plan generation even if cleanup fails
    }

    // Check if user is eligible to generate a new plan
    const eligibility = await storage.checkPlanGenerationEligibility(userId);
    if (!eligibility.canCreate) {
      return res.status(403).json({
        message: eligibility.message || 'You are not eligible to generate a new plan at this time',
        daysRemaining: eligibility.daysRemaining
      });
    }

    // Start the plan generation process with a clean state
    console.log(`[PLAN DEBUG] Starting fresh plan generation for user ${userId} after cleanup`);
    const result = await stepwiseCoach.startGeneration(userId, input);

    res.status(200).json({
      message: 'Plan generation started',
      // No statusId needed, we use userId as the identifier
      step: result.step,
      stepMessage: result.stepMessage,
      estimatedTimeRemaining: result.estimatedTimeRemaining,
      totalSteps: result.totalSteps
    });
  } catch (error) {
    console.error('Error starting plan generation:', error);
    res.status(500).json({
      message: 'An error occurred while starting plan generation',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Route to check the status of plan generation
 * GET /api/step-coach/status
 */
router.get('/status', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const userId = req.user.id;
    const status = await stepwiseCoach.getGenerationStatus(userId);

    if (!status) {
      return res.status(404).json({
        message: 'No active plan generation found',
        isGenerating: false
      });
    }

    // Auto-detect when a step is ready but not advancing
    // We check if data for the current step exists, and if so, trigger auto-continuation
    if (status.isGenerating) {
      try {
        // Get the actual data to check what's available
        const planData = await storage.getPlanGenerationData(userId);
        
        // Create detection logic for each step
        const checkStepReadyMap = {
          [PlanGenerationStep.WORKOUT_PLAN]: () => {
            console.log('🔍🔍🔍 [AUTO-DETECT] Checking if workout plan is ready but not advancing');
            return planData && planData.workoutPlan && 
                   planData.workoutPlan.weeklySchedule && 
                   Object.keys(planData.workoutPlan.weeklySchedule).length > 0;
          },
          [PlanGenerationStep.MEAL_PLAN]: () => {
            console.log('🔍🔍🔍 [AUTO-DETECT] Checking if meal plan is ready but not advancing');
            return planData && planData.mealPlan && 
                   planData.mealPlan.dailyMeals &&
                   Object.keys(planData.mealPlan.dailyMeals).length > 0;
          },
          [PlanGenerationStep.EXTRACT_INGREDIENTS]: () => {
            console.log('🔍🔍🔍 [AUTO-DETECT] Checking if ingredients are ready but not advancing');
            return planData && planData.ingredients && 
                   planData.ingredients.length > 0;
          },
          [PlanGenerationStep.SHOPPING_LIST]: () => {
            console.log('🔍🔍🔍 [AUTO-DETECT] Checking if shopping list is ready but not advancing');
            return planData && planData.shoppingList && 
                   planData.shoppingList.categories &&
                   Object.keys(planData.shoppingList.categories).length > 0;
          }
        };
        
        // Execute the appropriate check for the current step
        const checkFn = checkStepReadyMap[status.step];
        if (checkFn && checkFn()) {
          console.log(`✅✅✅ [AUTO-DETECT] Step ${status.step} (${status.stepMessage}) detected as ready but not advancing. Auto-continuing...`);
          
          // Schedule the continuation after sending the response
          setTimeout(async () => {
            try {
              console.log(`🔄🔄🔄 [AUTO-DETECT] Executing auto-continue from step ${status.step} for user`, userId);
              await stepwiseCoach.continueGeneration(userId);
              console.log('✅✅✅ [AUTO-DETECT] Auto-continue successful');
              
              // Try a second continuation after a short delay to ensure progress
              setTimeout(async () => {
                try {
                  console.log('🔄🔄🔄 [AUTO-DETECT] Executing second auto-continue attempt');
                  const result = await stepwiseCoach.continueGeneration(userId);
                  console.log(`✅✅✅ [AUTO-DETECT] Second auto-continue complete, now at step ${result.step}`);
                } catch (err) {
                  console.error('❌❌❌ [AUTO-DETECT] Second auto-continue failed:', err);
                }
              }, 2000);
            } catch (continueErr) {
              console.error('❌❌❌ [AUTO-DETECT] Auto-continue failed:', continueErr);
            }
          }, 500);
        } else if (checkFn) {
          console.log(`ℹ️ℹ️ℹ️ [AUTO-DETECT] Data for step ${status.step} not ready yet, no action needed`);
        }
      } catch (detectErr) {
        console.error('❌❌❌ [AUTO-DETECT] Error checking step data:', detectErr);
      }
    }
    
    res.status(200).json({
      isGenerating: status.isGenerating,
      step: status.step,
      stepMessage: status.stepMessage,
      estimatedTimeRemaining: status.estimatedTimeRemaining,
      totalSteps: status.totalSteps,
      errorMessage: status.errorMessage,
      isComplete: status.isComplete
    });
  } catch (error) {
    console.error('Error checking plan generation status:', error);
    res.status(500).json({
      message: 'An error occurred while checking plan generation status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Route to continue to the next step in plan generation
 * POST /api/step-coach/continue
 */
router.post('/continue', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const userId = req.user.id;
    console.log(`[PLAN DEBUG] Continue plan generation for user ID: ${userId}`);
    
    const status = await stepwiseCoach.getGenerationStatus(userId);
    console.log(`[PLAN DEBUG] Current status for user ${userId}:`, JSON.stringify(status, null, 2));

    if (!status) {
      console.log(`[PLAN DEBUG] No active generation found for user ${userId}`);
      return res.status(404).json({
        message: 'No active plan generation found'
      });
    }

    if (status.isComplete) {
      console.log(`[PLAN DEBUG] Plan generation already complete for user ${userId}`);
      return res.status(200).json({
        message: 'Plan generation is already complete',
        isComplete: true
      });
    }

    if (!status.isGenerating) {
      console.log(`[PLAN DEBUG] Plan generation not in progress for user ${userId}, isGenerating: ${status.isGenerating}`);
      return res.status(400).json({
        message: 'Plan generation is not in progress'
      });
    }

    console.log(`[PLAN DEBUG] Continuing to next step (${status.step}) for user ${userId}`);
    // Continue to the next step
    const result = await stepwiseCoach.continueGeneration(userId);
    console.log(`[PLAN DEBUG] Continue result for user ${userId}:`, JSON.stringify(result, null, 2));

    // Always auto-continue to the next step if we're not in COMPLETE state
    if (result.isGenerating && !result.isComplete) {
      console.log(`[PLAN DEBUG] Auto-advancing from step ${result.step} to next step for user ${userId}`);
      
      // Special handling for nutrition calculation step (1) - use a shorter delay
      const delay = result.step === 1 ? 500 : 1000;
      
      // Use setTimeout to avoid blocking the response
      setTimeout(async () => {
        try {
          console.log(`[PLAN DEBUG] Executing auto-advance for user ${userId} at step ${result.step}`);
          const nextResult = await stepwiseCoach.continueGeneration(userId);
          console.log(`[PLAN DEBUG] Auto-advance successful: moved to step ${nextResult.step} for user ${userId}`);
          
          // Special handling for step 1 - if we're still at this step despite continuing, force another continue
          if (nextResult.step === 1 && result.step === 1) {
            console.log(`[PLAN DEBUG] Still at step 1 after continuation, forcing another attempt for user ${userId}`);
            setTimeout(async () => {
              try {
                const forcedResult = await stepwiseCoach.continueGeneration(userId);
                console.log(`[PLAN DEBUG] Forced continuation successful: now at step ${forcedResult.step} for user ${userId}`);
              } catch (forcedErr) {
                console.error(`[PLAN DEBUG] Error in forced continuation for user ${userId}:`, forcedErr);
              }
            }, 1000);
          }
        } catch (autoErr) {
          console.error(`[PLAN DEBUG] Error in auto-advance for user ${userId}:`, autoErr);
        }
      }, delay);
    }

    res.status(200).json({
      message: 'Plan generation continued to next step',
      step: result.step,
      stepMessage: result.stepMessage,
      estimatedTimeRemaining: result.estimatedTimeRemaining,
      totalSteps: result.totalSteps,
      isComplete: result.isComplete
    });
  } catch (error) {
    console.error('Error continuing plan generation:', error);
    res.status(500).json({
      message: 'An error occurred while continuing plan generation',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Route to cancel plan generation
 * POST /api/step-coach/cancel
 */
router.post('/cancel', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const userId = req.user.id;
    const result = await stepwiseCoach.cancelGeneration(userId);

    if (!result) {
      return res.status(404).json({
        message: 'No active plan generation found'
      });
    }

    res.status(200).json({
      message: 'Plan generation cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling plan generation:', error);
    res.status(500).json({
      message: 'An error occurred while cancelling plan generation',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Route to reset plan generation state (both for stuck states and admin purposes)
 * POST /api/step-coach/reset
 */
router.post('/reset', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const userId = req.user.id;
    
    // First try to cancel any existing generation - now with improved error handling
    await stepwiseCoach.cancelGeneration(userId);
    
    // Then delete the generation status from the database
    await storage.deletePlanGenerationStatus(userId);
    
    // Also mark any existing plan as inactive to prevent conflicts
    await storage.deactivateUserFitnessPlans(userId);
    
    res.status(200).json({
      message: 'Plan generation state reset successfully'
    });
  } catch (error) {
    console.error('Error resetting plan generation state:', error);
    res.status(500).json({
      message: 'An error occurred while resetting plan generation state',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Route to get the final results of plan generation
 * GET /api/step-coach/result
 */
router.get('/result', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const userId = req.user.id;
    const result = await stepwiseCoach.getGenerationResult(userId);

    if (!result) {
      return res.status(404).json({
        message: 'No completed plan generation found'
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting plan generation result:', error);
    res.status(500).json({
      message: 'An error occurred while getting plan generation result',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Route to force-continue plan generation if it's stuck at step 2 (workout plan)
 * POST /api/step-coach/force-continue
 */
router.post('/force-continue', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const userId = req.user.id;
    console.log(`🔨🔨🔨 [FORCE CONTINUE] Attempting to force-continue plan generation for user ${userId}`);
    
    // First, get the current status
    const status = await stepwiseCoach.getGenerationStatus(userId);
    
    if (!status) {
      console.log(`❌❌❌ [FORCE CONTINUE] No active generation found for user ${userId}`);
      return res.status(404).json({
        message: 'No active plan generation found'
      });
    }

    if (!status.isGenerating) {
      console.log(`❌❌❌ [FORCE CONTINUE] Plan generation not in progress for user ${userId}`);
      return res.status(400).json({
        message: 'Plan generation is not in progress'
      });
    }

    console.log(`ℹ️ℹ️ℹ️ [FORCE CONTINUE] Current status: Step ${status.step} (${status.stepMessage}) for user ${userId}`);
    
    // Try to continue generation, regardless of current step
    console.log(`🔄🔄🔄 [FORCE CONTINUE] Forcing continuation for user ${userId}`);
    const result = await stepwiseCoach.continueGeneration(userId);
    console.log(`✅✅✅ [FORCE CONTINUE] Force-continue complete, now at step ${result.step} for user ${userId}`);

    // If step didn't change, schedule another attempt
    if (result.step === status.step) {
      console.log(`⚠️⚠️⚠️ [FORCE CONTINUE] Step didn't change (${result.step}), scheduling another attempt for user ${userId}`);
      
      setTimeout(async () => {
        try {
          console.log(`🔁🔁🔁 [FORCE CONTINUE] Executing second force-continue attempt for user ${userId}`);
          const secondResult = await stepwiseCoach.continueGeneration(userId);
          console.log(`✅✅✅ [FORCE CONTINUE] Second force-continue complete, now at step ${secondResult.step} for user ${userId}`);
        } catch (secondErr) {
          console.error(`❌❌❌ [FORCE CONTINUE] Second attempt failed for user ${userId}:`, secondErr);
        }
      }, 3000);
    }

    res.status(200).json({
      message: 'Force-continue executed successfully',
      previousStep: status.step,
      currentStep: result.step,
      stepMessage: result.stepMessage,
      isComplete: result.isComplete
    });
  } catch (error) {
    console.error('Error in force-continue:', error);
    res.status(500).json({
      message: 'An error occurred during force-continue',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;