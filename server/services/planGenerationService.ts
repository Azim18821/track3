/**
 * Plan Generation Service
 * Manages the process of generating and storing personalized fitness plans
 */

import { db } from '../db';
import { eq, desc, and } from 'drizzle-orm';
import { 
  fitnessPlans, 
  planGenerationProgress, 
  type FitnessPlan, 
  type InsertFitnessPlan,
  type PlanGenerationProgress,
  type User
} from '@shared/schema';
import { 
  generatePersonalizedPlan, 
  type PlanGenerationRequest,
  type PlanGenerationResult,
  type PlanGenerationProgressUpdate
} from './planGeneratorService';

/**
 * Starts a new plan generation process
 */
export async function startPlanGeneration(
  user: User,
  preferences: PlanGenerationRequest['preferences']
): Promise<PlanGenerationProgress> {
  // First, check if there's already a plan being generated
  const existingProgress = await db.select()
    .from(planGenerationProgress)
    .where(eq(planGenerationProgress.userId, user.id))
    .orderBy(desc(planGenerationProgress.updatedAt))
    .limit(1);

  // If there's an active generation, return that instead of starting a new one
  if (existingProgress.length > 0 && existingProgress[0].isGenerating) {
    console.log(`[PlanService] Found existing generation for user ${user.id}`);
    return existingProgress[0];
  }

  // Create initial progress record
  const [progress] = await db.insert(planGenerationProgress)
    .values({
      userId: user.id,
      isGenerating: true,
      currentStep: 1,
      totalSteps: 6,
      stepMessage: 'Starting plan generation...',
      estimatedTimeRemaining: 180, // 3 minutes estimate
      retryCount: 0
    })
    .returning();

  console.log(`[PlanService] Started plan generation for user ${user.id}`);

  // Start the generation process asynchronously
  generatePlanAsync(user, preferences, progress.id).catch(error => {
    console.error(`[PlanService] Error in async plan generation:`, error);
  });

  return progress;
}

/**
 * Asynchronously generates a plan and handles progress updates
 * This runs in the background and updates the database as it progresses
 */
async function generatePlanAsync(
  user: User,
  preferences: PlanGenerationRequest['preferences'], 
  progressId: number
): Promise<void> {
  try {
    console.log(`[PlanService] Generating plan asynchronously for user ${user.id}`);
    
    // Create progress callback function
    const updateProgress = async (update: PlanGenerationProgressUpdate): Promise<void> => {
      // Update the progress in the database
      await db.update(planGenerationProgress)
        .set({
          isGenerating: update.isGenerating,
          updatedAt: update.updatedAt,
          currentStep: update.currentStep,
          totalSteps: update.totalSteps,
          stepMessage: update.stepMessage,
          estimatedTimeRemaining: update.estimatedTimeRemaining,
          errorMessage: update.errorMessage,
          retryCount: update.retryCount,
          dataJson: update.dataJson
        })
        .where(eq(planGenerationProgress.id, progressId));
      
      console.log(`[PlanService] Updated progress for user ${user.id}: ${update.stepMessage} (${update.currentStep}/${update.totalSteps})`);
    };

    // Create the request object
    const request: PlanGenerationRequest = {
      user,
      preferences
    };

    // Generate the plan using our AI service
    const result = await generatePersonalizedPlan(request, updateProgress);
    
    // If successful, create the fitness plan
    if (result) {
      console.log(`[PlanService] Plan generation completed successfully for user ${user.id}`);
      
      // First, deactivate any existing active plans
      const existingPlans = await db.select()
        .from(fitnessPlans)
        .where(
          and(
            eq(fitnessPlans.userId, user.id),
            eq(fitnessPlans.isActive, true)
          )
        );

      if (existingPlans.length > 0) {
        await db.update(fitnessPlans)
          .set({ 
            isActive: false,
            deactivatedAt: new Date(),
            deactivationReason: 'New plan generated'
          })
          .where(eq(fitnessPlans.userId, user.id));
      }

      // Insert the new plan
      const planData: InsertFitnessPlan = {
        preferences: preferences,
        workoutPlan: result.workoutPlan,
        mealPlan: result.mealPlan,
        groceryList: result.groceryList,
        nutritionData: result.nutritionData,
        summary: result.summary,
        isActive: true,
        weeklyBudget: preferences.weeklyBudget,
        budgetCurrency: preferences.budgetCurrency,
        actualCost: result.groceryList.totalCost
      };

      await db.insert(fitnessPlans)
        .values({
          userId: user.id,
          ...planData
        });

      console.log(`[PlanService] Saved new fitness plan for user ${user.id}`);
    }
  } catch (error: any) {
    console.error(`[PlanService] Error generating plan for user ${user.id}:`, error);
    
    // Update progress with error
    await db.update(planGenerationProgress)
      .set({
        isGenerating: false,
        updatedAt: new Date(),
        errorMessage: error?.message || 'Unknown error in plan generation',
        dataJson: JSON.stringify({ error: error?.message || 'Unknown error', isComplete: false })
      })
      .where(eq(planGenerationProgress.id, progressId));
  }
}

/**
 * Gets the current plan generation progress for a user
 */
export async function getPlanGenerationProgress(userId: number): Promise<PlanGenerationProgress | undefined> {
  const [progress] = await db.select()
    .from(planGenerationProgress)
    .where(eq(planGenerationProgress.userId, userId))
    .orderBy(desc(planGenerationProgress.updatedAt))
    .limit(1);
  
  return progress;
}

/**
 * Gets the active fitness plan for a user
 */
export async function getActiveFitnessPlan(userId: number): Promise<FitnessPlan | undefined> {
  const [plan] = await db.select()
    .from(fitnessPlans)
    .where(
      and(
        eq(fitnessPlans.userId, userId),
        eq(fitnessPlans.isActive, true)
      )
    );
  
  return plan;
}

/**
 * Cancels an ongoing plan generation
 */
export async function cancelPlanGeneration(userId: number): Promise<boolean> {
  try {
    await db.update(planGenerationProgress)
      .set({
        isGenerating: false,
        updatedAt: new Date(),
        errorMessage: 'Cancelled by user',
        dataJson: JSON.stringify({ 
          error: 'Plan generation cancelled by user', 
          isComplete: false 
        })
      })
      .where(
        and(
          eq(planGenerationProgress.userId, userId),
          eq(planGenerationProgress.isGenerating, true)
        )
      );
    
    return true;
  } catch (error) {
    console.error(`Failed to cancel plan generation for user ${userId}:`, error);
    return false;
  }
}