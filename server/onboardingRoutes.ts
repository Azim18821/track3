import { Router, Request, Response } from 'express';
import { ensureAuthenticated } from './auth';
import { generateFitnessAnalysis, checkOnboardingStatus, acknowledgeAnalysis } from './onboardingService';
import { AIAnalysis } from '@shared/schema';

// Define the onboarding data interface
interface OnboardingData {
  fitnessGoal: string;
  bodyType: string;
  height: number;
  weight: number;
  heightUnit: string;
  weightUnit: string;
  gender: string;
  dateOfBirth?: string;
  age?: number;
}

const router = Router();

/**
 * Endpoint to generate personalized fitness analysis based on onboarding data
 * POST /api/onboarding/analysis
 */
router.post('/analysis', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const onboardingData = req.body as OnboardingData;
    
    console.log(`[API:1] POST /api/onboarding/analysis received for user ID: ${req.user?.id}`);
    
    // Validate required data
    if (!onboardingData.fitnessGoal || !onboardingData.height || !onboardingData.weight) {
      console.error(`[API:2] Missing required onboarding data:`, 
        `fitnessGoal=${!!onboardingData.fitnessGoal}`,
        `height=${!!onboardingData.height}`,
        `weight=${!!onboardingData.weight}`);
      return res.status(400).json({ error: 'Missing required onboarding data' });
    }
    
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      console.error(`[API:2] User not authenticated for onboarding analysis`);
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Log the full data for debugging purposes
    console.log(`[API:2] Onboarding data received for user ${req.user.id}:`, JSON.stringify(onboardingData, null, 2));
    console.log(`[API:3] Fitness goal type: ${typeof onboardingData.fitnessGoal}`);
    console.log(`[API:3] Original fitness goal value: ${JSON.stringify(onboardingData.fitnessGoal)}`);
    
    // Ensure fitness goal is a string
    const parsedFitnessGoal = typeof onboardingData.fitnessGoal === 'object' 
      ? JSON.stringify(onboardingData.fitnessGoal) 
      : onboardingData.fitnessGoal;
    
    console.log(`[API:4] Parsed fitness goal: ${parsedFitnessGoal}`);
    
    // Generate the analysis using the onboarding service
    console.log(`[API:5] Calling generateFitnessAnalysis for user ${req.user.id}`);
    const result = await generateFitnessAnalysis(req.user.id, {
      ...onboardingData,
      fitnessGoal: parsedFitnessGoal,
      // Ensure dateOfBirth is properly handled
      dateOfBirth: onboardingData.dateOfBirth || ''
    });
    
    // Log what we're returning to the client for debugging
    console.log(`[API:6] Analysis generation complete for user ${req.user.id}`);
    console.log(`[API:7] Returning AI analysis to client:`, JSON.stringify(result));
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error generating onboarding analysis:', error);
    return res.status(500).json({ 
      error: 'Failed to generate fitness analysis. Please try again.' 
    });
  }
});

/**
 * Endpoint to check if a user has completed onboarding
 * GET /api/onboarding/status
 */
router.get('/status', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log(`GET /api/onboarding/status for user ID: ${req.user?.id}`);
    
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      console.error(`User not authenticated for onboarding status check`);
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check onboarding status
    const status = await checkOnboardingStatus(req.user.id);
    
    return res.status(200).json(status);
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return res.status(500).json({ 
      error: 'Failed to check onboarding status. Please try again.' 
    });
  }
});

/**
 * Endpoint to acknowledge the user's analysis has been seen
 * POST /api/onboarding/acknowledge-analysis
 */
router.post('/acknowledge-analysis', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log(`POST /api/onboarding/acknowledge-analysis for user ID: ${req.user?.id}`);
    
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      console.error(`User not authenticated for acknowledging analysis`);
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Acknowledge the analysis
    const success = await acknowledgeAnalysis(req.user.id);
    
    if (success) {
      return res.status(200).json({ success: true, message: 'Analysis acknowledged successfully' });
    } else {
      return res.status(400).json({ success: false, message: 'Failed to acknowledge analysis' });
    }
  } catch (error) {
    console.error('Error acknowledging analysis:', error);
    return res.status(500).json({ 
      error: 'Failed to acknowledge analysis. Please try again.' 
    });
  }
});

export default router;