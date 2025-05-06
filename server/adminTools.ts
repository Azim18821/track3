import { storage } from './storage';

/**
 * Force deactivate a fitness plan regardless of time restrictions
 * Used by administrators for testing and troubleshooting
 */
export async function forceDeactivateFitnessPlan(planId: number): Promise<boolean> {
  try {
    console.log(`Admin forcing deactivation of fitness plan: ${planId}`);
    const result = await storage.deactivateFitnessPlan(planId);
    return result;
  } catch (error) {
    console.error(`Error force deactivating plan ${planId}:`, error);
    return false;
  }
}

/**
 * Reset user plan generation cooldown
 * Used by administrators for testing plan generation
 */
export async function resetUserPlanCooldown(userId: number): Promise<boolean> {
  try {
    console.log(`Admin resetting plan cooldown for user: ${userId}`);
    // Find any active plans for the user
    const activePlan = await storage.getActiveFitnessPlan(userId);
    
    // Deactivate active plans
    if (activePlan) {
      await storage.deactivateFitnessPlan(activePlan.id);
    }
    
    return true;
  } catch (error) {
    console.error(`Error resetting plan cooldown for user ${userId}:`, error);
    return false;
  }
}