import { Router, Request, Response } from 'express';
import { ensureAdmin } from './auth';
import { updateExercises, updateMeals, updateBothLibraries } from './adminLibraryUpdates';

const router = Router();

/**
 * Route to update the exercise library
 * POST /api/admin/update-libraries/exercises
 * Body: { count?: number, category?: string }
 */
router.post('/update-libraries/exercises', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const options = {
      count: req.body.count || 5,
      category: req.body.category
    };
    
    // Validate count
    if (options.count <= 0 || options.count > 20) {
      return res.status(400).json({ 
        success: false, 
        message: 'Count must be between 1 and 20' 
      });
    }
    
    const result = await updateExercises(options);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error: unknown) {
    console.error('Error in update exercises endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update exercise library', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * Route to update the meal recipe library
 * POST /api/admin/update-libraries/meals
 * Body: { count?: number, mealType?: string }
 */
router.post('/update-libraries/meals', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const options = {
      count: req.body.count || 5,
      mealType: req.body.mealType
    };
    
    // Validate count
    if (options.count <= 0 || options.count > 20) {
      return res.status(400).json({ 
        success: false, 
        message: 'Count must be between 1 and 20' 
      });
    }
    
    const result = await updateMeals(options);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error: unknown) {
    console.error('Error in update meals endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update meal recipe library', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Route to update both libraries at once
 * POST /api/admin/update-libraries/all
 * Body: { 
 *   exercises?: { count?: number, category?: string },
 *   meals?: { count?: number, mealType?: string }
 * }
 */
router.post('/update-libraries/all', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const options = {
      exercises: {
        count: req.body.exercises?.count || 5,
        category: req.body.exercises?.category
      },
      meals: {
        count: req.body.meals?.count || 5,
        mealType: req.body.meals?.mealType
      }
    };
    
    // Validate counts
    if (options.exercises.count <= 0 || options.exercises.count > 20 ||
        options.meals.count <= 0 || options.meals.count > 20) {
      return res.status(400).json({ 
        success: false, 
        message: 'Count must be between 1 and 20 for both libraries' 
      });
    }
    
    const result = await updateBothLibraries(options);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error: unknown) {
    console.error('Error in update all libraries endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update libraries', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * Route for admin to get all clients for a trainer
 * GET /api/admin/trainers/:trainerId/clients
 */
router.get('/trainers/:trainerId/clients', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const trainerId = parseInt(req.params.trainerId);
    
    // Verify the trainer exists
    const trainer = await storage.getUser(trainerId);
    if (!trainer) {
      return res.status(404).json({ message: "Trainer not found" });
    }
    
    // Get all trainer-client relationships for this trainer
    const trainerClients = await storage.getTrainerClients(trainerId);
    
    // Format the response to match the expected structure
    const formattedRelationships = trainerClients.map(tc => ({
      id: tc.relationship.id,
      trainerId: tc.relationship.trainerId,
      clientId: tc.relationship.clientId,
      assignedAt: tc.relationship.assignedAt,
      notes: tc.relationship.notes,
      client: {
        id: tc.client.id,
        username: tc.client.username,
        email: tc.client.email
      }
    }));
    
    res.status(200).json(formattedRelationships);
  } catch (error) {
    console.error("Error fetching trainer's clients:", error);
    res.status(500).json({ message: "Failed to fetch trainer's clients" });
  }
});

/**
 * Route for admin to get all trainers for a client
 * GET /api/admin/clients/:clientId/trainers
 */
router.get('/clients/:clientId/trainers', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId);
    
    // Verify the client exists
    const client = await storage.getUser(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    
    // Get all trainer-client relationships for this client
    const clientTrainers = await storage.getClientTrainers(clientId);
    
    // Format the response to match the expected structure
    const formattedRelationships = clientTrainers.map(ct => ({
      id: ct.relationship.id,
      trainerId: ct.relationship.trainerId,
      clientId: ct.relationship.clientId,
      assignedAt: ct.relationship.assignedAt,
      notes: ct.relationship.notes,
      trainer: {
        id: ct.trainer.id,
        username: ct.trainer.username,
        email: ct.trainer.email
      }
    }));
    
    res.status(200).json(formattedRelationships);
  } catch (error) {
    console.error("Error fetching client's trainers:", error);
    res.status(500).json({ message: "Failed to fetch client's trainers" });
  }
});

/**
 * Route to get library update status
 * GET /api/admin/update-libraries/status
 */
router.get('/update-libraries/status', ensureAdmin, async (req: Request, res: Response) => {
  try {
    // This is a placeholder for a more robust status tracking system
    // In a production app, you might track the status of library updates in a database
    res.status(200).json({ 
      success: true,
      status: 'idle', // Could be 'idle', 'updating', 'completed', 'failed'
      lastUpdate: null, // You could store the timestamp of the last update
      message: 'Library update system ready' 
    });
  } catch (error: unknown) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get library update status', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});



export default router;