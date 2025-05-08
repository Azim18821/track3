/**
 * Plan Generation Service
 * Client-side service for communicating with fitness plan generation APIs
 */

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FitnessPlan, PlanGenerationProgress } from "@shared/schema";

/**
 * Progress polling interval in milliseconds
 */
const POLLING_INTERVAL = 3000;

/**
 * Interface for plan generation request parameters
 */
export interface PlanGenerationParams {
  fitnessGoal: string;
  workoutDaysPerWeek: number;
  dietPreferences: string[];
  restrictions: string[];
  weeklyBudget: number;
  budgetCurrency: string;
  activityLevel: string;
  workoutDuration: number;
  fitnessLevel: string;
}

/**
 * Initiates the generation of a new fitness plan
 */
export async function startPlanGeneration(params: PlanGenerationParams): Promise<{ progress: PlanGenerationProgress }> {
  const response = await apiRequest("POST", "/api/fitness-plans/generate", params);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to start plan generation: ${errorText}`);
  }
  
  const data = await response.json();
  return data;
}

/**
 * Checks the current progress of plan generation
 */
export async function checkPlanGenerationProgress(): Promise<PlanGenerationProgress> {
  const response = await apiRequest("GET", "/api/fitness-plans/progress");
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to check plan generation progress: ${errorText}`);
  }
  
  const progress = await response.json();
  return progress;
}

/**
 * Cancels an in-progress plan generation
 */
export async function cancelPlanGeneration(): Promise<{ message: string }> {
  const response = await apiRequest("POST", "/api/fitness-plans/cancel");
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to cancel plan generation: ${errorText}`);
  }
  
  const result = await response.json();
  
  // Invalidate the progress cache
  queryClient.invalidateQueries({ queryKey: ['/api/fitness-plans/progress'] });
  
  return result;
}

/**
 * Gets the active fitness plan for the current user
 */
export async function getActiveFitnessPlan(): Promise<FitnessPlan> {
  const response = await apiRequest("GET", "/api/fitness-plans/active");
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get active fitness plan: ${errorText}`);
  }
  
  const plan = await response.json();
  return plan;
}

/**
 * Subscribe to plan generation progress updates
 * This function returns a cleanup function to remove the subscription
 */
export function subscribeToProgressUpdates(
  callback: (progress: PlanGenerationProgress) => void
): () => void {
  let timer: number | null = null;
  let isCancelled = false;
  
  const checkProgress = async () => {
    if (isCancelled) return;
    
    try {
      const progress = await checkPlanGenerationProgress();
      callback(progress);
      
      // If still generating, continue polling
      if (progress.isGenerating) {
        timer = window.setTimeout(checkProgress, POLLING_INTERVAL);
      }
    } catch (error) {
      console.error("Error checking plan generation progress:", error);
      
      // Retry even on error, but with slightly longer delay
      timer = window.setTimeout(checkProgress, POLLING_INTERVAL * 2);
    }
  };
  
  // Start checking immediately
  checkProgress();
  
  // Return cleanup function
  return () => {
    isCancelled = true;
    if (timer !== null) {
      window.clearTimeout(timer);
    }
  };
}

/**
 * Creates a React Query key for a fitness plan
 */
export function getPlanQueryKey(planId?: number): string[] {
  return planId 
    ? ['/api/fitness-plans', planId.toString()]
    : ['/api/fitness-plans/active'];
}

/**
 * Calculates the expected time remaining text from a progress object
 */
export function formatTimeRemaining(estimatedSeconds: number): string {
  if (estimatedSeconds <= 0) {
    return 'Almost done...';
  }
  
  if (estimatedSeconds < 60) {
    return `${estimatedSeconds} seconds remaining`;
  }
  
  const minutes = Math.ceil(estimatedSeconds / 60);
  return `About ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} remaining`;
}

/**
 * Formats the overall progress percentage
 */
export function getProgressPercentage(progress: PlanGenerationProgress): number {
  const { currentStep, totalSteps } = progress;
  return Math.min(Math.floor((currentStep / totalSteps) * 100), 99);
}