/**
 * Plan Generation Routes
 * Handles API endpoints for fitness plan generation
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from './auth';
import { 
  startPlanGeneration, 
  getPlanGenerationProgress,
  getActiveFitnessPlan,
  cancelPlanGeneration
} from './services/planGenerationService';

const router = express.Router();

// Validation schema for plan generation request
const planGenerationSchema = z.object({
  fitnessGoal: z.string(),
  workoutDaysPerWeek: z.number().int().min(1).max(7),
  dietPreferences: z.array(z.string()).default([]),
  restrictions: z.array(z.string()).default([]),
  weeklyBudget: z.number().positive(),
  budgetCurrency: z.string().default('GBP'),
  activityLevel: z.string(),
  workoutDuration: z.number().int().positive(),
  fitnessLevel: z.string()
});

/**
 * Route to start generating a fitness plan
 * POST /api/fitness-plans/generate
 */
router.post('/generate', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const validationResult = planGenerationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid plan generation parameters', 
        details: validationResult.error.issues 
      });
    }
    
    const preferences = validationResult.data;
    const user = req.user!;
    
    // Start the plan generation process
    const progress = await startPlanGeneration(user, preferences);
    
    res.status(200).json({
      message: 'Plan generation started',
      progress
    });
  } catch (error: any) {
    console.error('Error starting plan generation:', error);
    res.status(500).json({ error: error.message || 'Failed to start plan generation' });
  }
});

/**
 * Route to check plan generation progress
 * GET /api/fitness-plans/progress
 */
router.get('/progress', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const progress = await getPlanGenerationProgress(userId);
    
    if (!progress) {
      return res.status(404).json({ error: 'No plan generation found' });
    }
    
    res.status(200).json(progress);
  } catch (error: any) {
    console.error('Error checking plan generation progress:', error);
    res.status(500).json({ error: error.message || 'Failed to check plan generation progress' });
  }
});

/**
 * Route to cancel an ongoing plan generation
 * POST /api/fitness-plans/cancel
 */
router.post('/cancel', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await cancelPlanGeneration(userId);
    
    if (result) {
      res.status(200).json({ message: 'Plan generation cancelled successfully' });
    } else {
      res.status(400).json({ error: 'Failed to cancel plan generation' });
    }
  } catch (error: any) {
    console.error('Error cancelling plan generation:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel plan generation' });
  }
});

/**
 * Route to get the active fitness plan
 * GET /api/fitness-plans/active
 */
router.get('/active', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const plan = await getActiveFitnessPlan(userId);
    
    if (!plan) {
      return res.status(404).json({ error: 'No active fitness plan found' });
    }
    
    res.status(200).json(plan);
  } catch (error: any) {
    console.error('Error fetching active fitness plan:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch active fitness plan' });
  }
});

export default router;