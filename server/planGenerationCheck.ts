/**
 * Utility to check for and repair stale plan generation statuses
 * This helps prevent users from getting stuck with plans that can't be completed or reset
 */

import { db } from './db';
import { eq, and, lt } from 'drizzle-orm';
import { planGenerationStatus } from '@shared/schema';
import { storage } from './storage';

/**
 * Check for and repair any stuck plan generation statuses on application startup
 * This function will find any stuck or stale generation statuses and reset them,
 * preventing users from getting locked out of the plan generation feature
 */
export async function checkAndRepairPlanGenerationStatus(): Promise<void> {
  try {
    console.log('Checking for stale plan generation statuses...');
    
    // Find any statuses that are still marked as "generating" but haven't been updated in 15 minutes
    const MAX_GENERATION_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds
    const cutoffTime = new Date(Date.now() - MAX_GENERATION_TIME);
    
    // Try to find stuck statuses in a safe way
    let stuckStatusIds: number[] = [];
    
    try {
      // Get all active generation statuses
      const activeStatuses = await db
        .select()
        .from(planGenerationStatus)
        .where(eq(planGenerationStatus.isGenerating, true));

      // Filter locally to avoid SQL-level errors with column names
      stuckStatusIds = activeStatuses
        .filter(status => {
          const updatedAt = new Date(status.updatedAt).getTime();
          return updatedAt < cutoffTime.getTime();
        })
        .map(status => status.userId);
    } catch (queryError) {
      console.warn('Error querying for stuck statuses, using fallback approach:', queryError);
      // Continue with recovery even if this part fails
    }
    
    // Use direct user IDs if we found any
    const stuckStatuses = stuckStatusIds.map(userId => ({ userId }));
    
    if (stuckStatuses.length === 0) {
      console.log('No stale plan generation statuses found.');
      return;
    }
    
    console.log(`Found ${stuckStatuses.length} stale plan generation status(es). Resetting...`);
    
    // Reset each stuck status
    for (const status of stuckStatuses) {
      try {
        // First, mark it as not generating with an error message
        await storage.setPlanGenerationStatus(status.userId, false, {
          errorMessage: 'Plan generation timed out and was automatically reset by the system'
        });
        
        // Then completely delete it to ensure a clean slate
        await storage.deletePlanGenerationStatus(status.userId);
        
        console.log(`Successfully reset stale plan generation for user ${status.userId}`);
      } catch (error) {
        console.error(`Failed to reset plan generation for user ${status.userId}:`, error);
      }
    }
    
    console.log('Plan generation status cleanup completed.');
  } catch (error) {
    console.error('Error checking plan generation statuses:', error);
  }
}