import { Router } from 'express';
import { storage } from './storage';
import { z } from 'zod';
import { WebSocket } from 'ws';
import { 
  insertTrainerNutritionPlanSchema, 
  insertTrainerFitnessPlanSchema,
  insertPlanTemplateSchema
} from '@shared/schema';
import { ensureAuthenticated, ensureTrainer } from './auth';

// Helper function to create workout entries for a client based on their fitness plan
// Type definition for a workout day
interface WorkoutDay {
  name: string;
  notes?: string;
  exercises: Array<{
    name: string;
    sets?: number;
    reps?: number;
    weight?: number;
    unit?: string;
    rest?: string;
    useAdvancedSets?: boolean;
    setsData?: any[];
    setType?: string;
    supersetWith?: string;
  }>;
}

interface WeeklySchedule {
  [key: string]: WorkoutDay;
}

interface WorkoutPlan {
  weeklySchedule: WeeklySchedule;
  notes?: string;
}

async function createClientWorkoutsFromPlan(clientId: number, workoutPlan: WorkoutPlan, planId: number) {
  try {
    // First clear any existing future workouts for this client
    const today = new Date();
    await storage.deleteFutureWorkoutsForUser(clientId, today);
    
    if (!workoutPlan || !workoutPlan.weeklySchedule) {
      console.log('No weekly workout schedule found in plan, skipping workout creation');
      return;
    }

    const weeklySchedule = workoutPlan.weeklySchedule;
    
    // For each day in the weekly schedule, create a workout
    for (const [day, dayData] of Object.entries(weeklySchedule)) {
      // Skip if the day has no exercises
      if (!dayData.exercises || dayData.exercises.length === 0) {
        continue;
      }
      
      // Calculate the date for this workout (next occurrence of this day)
      const workoutDate = getNextDayOfWeek(today, getDayNumber(day));
      
      // Create the workout
      const workout = await storage.createWorkout(clientId, {
        name: dayData.name || `${day.charAt(0).toUpperCase() + day.slice(1)} Workout`,
        date: workoutDate,
        duration: calculateTotalWorkoutDuration(dayData.exercises),
        notes: dayData.notes || `Auto-generated from fitness plan #${planId}`
      });
      
      console.log(`Created workout '${workout.name}' for client ${clientId} scheduled on ${workoutDate.toISOString()}`);
      
      // Create exercises for this workout
      for (const exercise of dayData.exercises) {
        await storage.createExercise({
          workoutId: workout.id,
          name: exercise.name,
          sets: exercise.sets || 3,
          reps: exercise.reps || 10,
          weight: exercise.weight || 0,
          unit: exercise.unit || 'kg',
          rest: exercise.rest || '60s',
          // If the plan has advanced sets data, include it
          setsData: exercise.useAdvancedSets && exercise.setsData ? exercise.setsData : undefined,
          setType: exercise.setType || undefined,
          supersetWith: exercise.supersetWith || undefined
        });
      }
      
      console.log(`Added ${dayData.exercises.length} exercises to workout '${workout.name}'`);
    }
    
    return true;
  } catch (error) {
    console.error('Error creating workouts from plan:', error);
    throw error;
  }
}

// Helper function to create meal entries for a client based on their fitness plan
// Interface for meal items to type check
interface MealItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: number;
  servingUnit?: string;
  type?: string;
}

interface MealWithFoods {
  foods: MealItem[];
  [key: string]: any;
}

// Helper function to clear all existing planned meals for a client
async function clearClientPlannedMeals(clientId: number) {
  try {
    // This will delete all planned meals (not consumed ones) for the client
    console.log(`Clearing all planned meals for client ${clientId}`);
    await storage.deletePlannedMealsForUser(clientId);
    return true;
  } catch (error) {
    console.error('Error clearing planned meals:', error);
    throw error;
  }
}

// Helper function to clear all existing workouts for a client
async function clearClientWorkouts(clientId: number) {
  try {
    // This will delete all future workouts for the client
    console.log(`Clearing all future workouts for client ${clientId}`);
    const today = new Date();
    await storage.deleteFutureWorkoutsForUser(clientId, today);
    return true;
  } catch (error) {
    console.error('Error clearing workouts:', error);
    throw error;
  }
}

async function createClientMealsFromPlan(clientId: number, mealPlan: any, planId: number) {
  try {
    // First, clear any existing planned meals for this client
    await clearClientPlannedMeals(clientId);
    
    // Check if mealPlan is missing or empty
    if (!mealPlan) {
      console.log('No meal plan found, skipping meal creation');
      return;
    }
    
    // Handle both dailyMeals and weeklyMeals formats
    let mealsToProcess = {};
    
    if (mealPlan.dailyMeals) {
      console.log('Processing dailyMeals format');
      mealsToProcess = mealPlan.dailyMeals;
      
      // Also transform dailyMeals to weeklyMeals format for consistent view in UI
      if (!mealPlan.weeklyMeals) {
        // Create a weeklyMeals structure with each day having the same meals
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        mealPlan.weeklyMeals = {};
        
        for (const day of days) {
          mealPlan.weeklyMeals[day] = { ...mealPlan.dailyMeals };
        }
        
        console.log('Created weeklyMeals structure from dailyMeals for consistent UI rendering');
      }
    } else if (mealPlan.weeklyMeals) {
      console.log('Processing weeklyMeals format');
      // Just process the first day's meals as template
      const firstDay = Object.keys(mealPlan.weeklyMeals)[0];
      if (firstDay && mealPlan.weeklyMeals[firstDay]) {
        mealsToProcess = mealPlan.weeklyMeals[firstDay];
      } else {
        console.log('No meal days found in weeklyMeals, skipping meal creation');
        return;
      }
    } else {
      console.log('No meal data structure found (neither dailyMeals nor weeklyMeals), skipping meal creation');
      return;
    }
    
    const today = new Date();
    let createdMeals = 0;
    
    // For each meal type, create a meal entry for today
    for (const [mealType, mealDataRaw] of Object.entries(mealsToProcess)) {
      const mealData = mealDataRaw as any;
      
      // Skip if it's not a valid meal data object
      if (!mealData || typeof mealData !== 'object') {
        continue;
      }
      
      // Handle array types like snacks and customMeals
      if (Array.isArray(mealData)) {
        for (const itemRaw of mealData) {
          const item = itemRaw as MealItem;
          if (!item || !item.name) continue;
          
          // For each item in the array, create a meal entry
          await storage.createMeal(clientId, {
            name: item.name,
            mealType: item.type ? formatMealType(item.type) : formatMealType(mealType),
            servingSize: item.servingSize || 1,
            servingUnit: item.servingUnit || 'serving',
            calories: item.calories || 0,
            protein: item.protein || 0,
            carbs: item.carbs || 0,
            fat: item.fat || 0,
            date: today,
            isPlanned: true // Mark as planned/suggested, not consumed
          });
          createdMeals++;
        }
        console.log(`Created ${createdMeals} meal entries for '${mealType}' array for client ${clientId}`);
        continue;
      }
      
      // Handle legacy format with foods array
      const mealWithFoods = mealData as MealWithFoods;
      if (mealWithFoods.foods && Array.isArray(mealWithFoods.foods) && mealWithFoods.foods.length > 0) {
        for (const food of mealWithFoods.foods) {
          if (!food.name) continue;
          
          await storage.createMeal(clientId, {
            name: food.name,
            mealType: formatMealType(mealType),
            servingSize: food.servingSize || 1,
            servingUnit: food.servingUnit || 'serving',
            calories: food.calories || 0,
            protein: food.protein || 0,
            carbs: food.carbs || 0,
            fat: food.fat || 0,
            date: today,
            isPlanned: true // Mark as planned/suggested, not consumed
          });
          createdMeals++;
        }
        console.log(`Created ${mealWithFoods.foods.length} meal entries from foods array for '${mealType}' for client ${clientId}`);
        continue;
      }
      
      // Handle direct meal data (new format without foods array)
      const mealItem = mealData as MealItem;
      if (mealItem.name) {
        await storage.createMeal(clientId, {
          name: mealItem.name,
          mealType: formatMealType(mealType),
          servingSize: mealItem.servingSize || 1,
          servingUnit: mealItem.servingUnit || 'serving',
          calories: mealItem.calories || 0,
          protein: mealItem.protein || 0,
          carbs: mealItem.carbs || 0,
          fat: mealItem.fat || 0,
          date: today,
          isPlanned: true // Mark as planned/suggested, not consumed
        });
        createdMeals++;
        console.log(`Created meal entry for '${mealType}' for client ${clientId}`);
      }
    }
    
    console.log(`Total meals created for client ${clientId}: ${createdMeals}`);
    return true;
  } catch (error) {
    console.error('Error creating meals from plan:', error);
    throw error;
  }
}

// Helper function to get the next occurrence of a specific day of the week
function getNextDayOfWeek(date: Date, dayOfWeek: number): Date {
  const resultDate = new Date(date.getTime());
  // Calculate days to add
  let daysToAdd = (7 + dayOfWeek - date.getDay()) % 7;
  // If daysToAdd is 0, we're targeting the same day as today
  // We still want to schedule it for today, not next week
  resultDate.setDate(date.getDate() + daysToAdd);
  return resultDate;
}

// Helper function to convert day string to day number (0 = Sunday, 1 = Monday, etc)
function getDayNumber(day: string): number {
  const days: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };
  return days[day.toLowerCase()] || 1; // Default to Monday if not found
}

// Helper function to calculate approximate workout duration based on exercises
function calculateTotalWorkoutDuration(exercises: any[]): number {
  if (!exercises || exercises.length === 0) return 30; // Default 30 minutes
  
  // Assume ~2 minutes per set as a rough estimate
  const totalSets = exercises.reduce((total, ex) => total + (ex.sets || 3), 0);
  return Math.max(30, Math.min(120, totalSets * 2)); // Between 30-120 minutes
}

// Helper function to format meal type to standard format
function formatMealType(mealType: string): string {
  const type = mealType.toLowerCase();
  
  if (type.includes('breakfast') || type === 'morning') return 'breakfast';
  if (type.includes('lunch') || type === 'midday') return 'lunch';
  if (type.includes('dinner') || type === 'evening' || type === 'supper') return 'dinner';
  if (type.includes('snack')) return 'snack';
  
  // Enhanced support for common custom meal types
  if (type.includes('pre-workout') || type === 'pre_workout' || type === 'preworkout') return 'Pre-workout';
  if (type.includes('post-workout') || type === 'post_workout' || type === 'postworkout') return 'Post-workout';
  if (type.includes('mid-morning') || type === 'mid_morning' || type === 'midmorning') return 'Mid-morning';
  if (type.includes('afternoon')) return 'Afternoon';
  if (type.includes('evening') || type === 'night') return 'Evening';
  
  // Custom meal types get preserved but formatted
  return mealType.charAt(0).toUpperCase() + mealType.slice(1).toLowerCase();
}

const router = Router();

// Apply authentication middleware to all trainer routes
router.use(ensureAuthenticated);
router.use(ensureTrainer);

// === PLAN TEMPLATES ROUTES ===

// Get all plan templates for a trainer
router.get('/plan-templates', async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const templates = await storage.getPlanTemplates(trainerId);
    res.json(templates);
  } catch (error) {
    console.error('Error getting plan templates:', error);
    res.status(500).json({ message: 'Failed to retrieve plan templates' });
  }
});

// Get a specific plan template by ID
router.get('/plan-templates/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const template = await storage.getPlanTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({ message: 'Plan template not found' });
    }
    
    // Check if the requesting trainer is the creator of the template
    if (template.trainerId !== req.user!.id) {
      return res.status(403).json({ message: 'You are not authorized to view this template' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error getting plan template:', error);
    res.status(500).json({ message: 'Failed to retrieve plan template' });
  }
});

// Create a new plan template
router.post('/plan-templates', async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const templateData = insertPlanTemplateSchema.parse({
      ...req.body,
      trainerId
    });
    
    const newTemplate = await storage.createPlanTemplate(templateData);
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error creating plan template:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid template data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create plan template' });
  }
});

// Update an existing plan template
router.put('/plan-templates/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const template = await storage.getPlanTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({ message: 'Plan template not found' });
    }
    
    // Check if the requesting trainer is the creator of the template
    if (template.trainerId !== req.user!.id) {
      return res.status(403).json({ message: 'You are not authorized to update this template' });
    }
    
    // Remove trainerId from the update data to prevent reassignment
    const { trainerId, ...updateData } = req.body;
    
    const updatedTemplate = await storage.updatePlanTemplate(templateId, updateData);
    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating plan template:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid template data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to update plan template' });
  }
});

// Delete a plan template
router.delete('/plan-templates/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const template = await storage.getPlanTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({ message: 'Plan template not found' });
    }
    
    // Check if the requesting trainer is the creator of the template
    if (template.trainerId !== req.user!.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this template' });
    }
    
    const deleted = await storage.deletePlanTemplate(templateId);
    
    if (deleted) {
      res.status(200).json({ message: 'Plan template deleted successfully' });
    } else {
      res.status(500).json({ message: 'Failed to delete plan template' });
    }
  } catch (error) {
    console.error('Error deleting plan template:', error);
    res.status(500).json({ message: 'Failed to delete plan template' });
  }
});

// Archive or unarchive a plan template
router.patch('/plan-templates/:id/archive', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const { archived } = req.body;
    
    if (typeof archived !== 'boolean') {
      return res.status(400).json({ message: 'Archived status must be a boolean' });
    }
    
    const template = await storage.getPlanTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({ message: 'Plan template not found' });
    }
    
    // Check if the requesting trainer is the creator of the template
    if (template.trainerId !== req.user!.id) {
      return res.status(403).json({ message: 'You are not authorized to modify this template' });
    }
    
    const success = await storage.archivePlanTemplate(templateId, archived);
    
    if (success) {
      res.status(200).json({ 
        message: archived ? 'Plan template archived successfully' : 'Plan template unarchived successfully',
        isArchived: archived
      });
    } else {
      res.status(500).json({ message: 'Failed to update plan template archive status' });
    }
  } catch (error) {
    console.error('Error updating plan template archive status:', error);
    res.status(500).json({ message: 'Failed to update plan template archive status' });
  }
});

// Apply a template to create a client plan
router.post('/plan-templates/:id/apply', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const { clientId } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required' });
    }
    
    const template = await storage.getPlanTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({ message: 'Plan template not found' });
    }
    
    // Check if the requesting trainer is the creator of the template
    if (template.trainerId !== req.user!.id) {
      return res.status(403).json({ message: 'You are not authorized to use this template' });
    }
    
    // Check if the client is assigned to this trainer
    const trainerClients = await storage.getTrainerClients(req.user!.id);
    const isClientOfTrainer = trainerClients.some(tc => tc.client.id === clientId);
    
    if (!isClientOfTrainer) {
      return res.status(403).json({ message: 'This client is not assigned to you' });
    }
    
    // Create a new plan for the client based on the template
    let newPlan;
    if (template.type === 'fitness' || template.type === 'combined') {
      // Create fitness plan
      newPlan = await storage.createTrainerFitnessPlan({
        trainerId: req.user!.id,
        clientId: clientId,
        name: template.name,
        description: template.description || null,
        workoutPlan: template.workoutPlan || { weeklySchedule: {}, notes: '' },
        mealPlan: template.type === 'combined' ? (template.mealPlan || { weeklyMeals: {}, notes: '' }) : { weeklyMeals: {}, notes: '' },
        notes: template.notes || null,
        isActive: true
      });
    } else if (template.type === 'nutrition') {
      // For nutrition-only templates, create a nutrition plan
      // Add implementation based on your nutrition plan structure
    }
    
    res.status(201).json({ 
      message: 'Plan created successfully from template',
      plan: newPlan
    });
  } catch (error) {
    console.error('Error applying plan template:', error);
    res.status(500).json({ message: 'Failed to apply plan template' });
  }
});

// === NUTRITION PLANS ROUTES ===

// Get all nutrition plans created by a trainer
router.get('/nutrition-plans', async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const plans = await storage.getTrainerNutritionPlans(trainerId);
    res.json(plans);
  } catch (error) {
    console.error('Error getting trainer nutrition plans:', error);
    res.status(500).json({ message: 'Failed to retrieve nutrition plans' });
  }
});

// Get a specific nutrition plan by ID
router.get('/nutrition-plans/:id', async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const plan = await storage.getTrainerNutritionPlan(planId);
    
    if (!plan) {
      return res.status(404).json({ message: 'Nutrition plan not found' });
    }
    
    // Check if the requesting trainer is the creator of the plan
    if (plan.trainerId !== req.user!.id) {
      return res.status(403).json({ message: 'You are not authorized to view this plan' });
    }
    
    res.json(plan);
  } catch (error) {
    console.error('Error getting nutrition plan:', error);
    res.status(500).json({ message: 'Failed to retrieve nutrition plan' });
  }
});

// Create a new nutrition plan
router.post('/nutrition-plans', async (req, res) => {
  try {
    const trainerId = req.user!.id;
    
    // Validate request body
    const validatedData = insertTrainerNutritionPlanSchema.parse({
      ...req.body,
      trainerId
    });
    
    // Create nutrition plan
    const newPlan = await storage.createTrainerNutritionPlan(validatedData);
    res.status(201).json(newPlan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid nutrition plan data', errors: error.errors });
    }
    console.error('Error creating nutrition plan:', error);
    res.status(500).json({ message: 'Failed to create nutrition plan' });
  }
});

// Update a nutrition plan
router.patch('/nutrition-plans/:id', async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const existingPlan = await storage.getTrainerNutritionPlan(planId);
    
    if (!existingPlan) {
      return res.status(404).json({ message: 'Nutrition plan not found' });
    }
    
    // Check if the requesting trainer is the creator of the plan
    if (existingPlan.trainerId !== req.user!.id) {
      return res.status(403).json({ message: 'You are not authorized to update this plan' });
    }
    
    // Partial validation of request body
    const validatedData = insertTrainerNutritionPlanSchema.partial().parse(req.body);
    
    // Update nutrition plan
    const updatedPlan = await storage.updateTrainerNutritionPlan(planId, validatedData);
    res.json(updatedPlan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid nutrition plan data', errors: error.errors });
    }
    console.error('Error updating nutrition plan:', error);
    res.status(500).json({ message: 'Failed to update nutrition plan' });
  }
});

// Delete a nutrition plan
router.delete('/nutrition-plans/:id', async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const existingPlan = await storage.getTrainerNutritionPlan(planId);
    
    if (!existingPlan) {
      return res.status(404).json({ message: 'Nutrition plan not found' });
    }
    
    // Check if the requesting trainer is the creator of the plan
    if (existingPlan.trainerId !== req.user!.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this plan' });
    }
    
    // Delete nutrition plan
    const success = await storage.deleteTrainerNutritionPlan(planId);
    
    if (success) {
      res.status(204).end();
    } else {
      res.status(500).json({ message: 'Failed to delete nutrition plan' });
    }
  } catch (error) {
    console.error('Error deleting nutrition plan:', error);
    res.status(500).json({ message: 'Failed to delete nutrition plan' });
  }
});

// Get nutrition plans for a specific client
router.get('/clients/:clientId/nutrition-plans', async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const clientId = parseInt(req.params.clientId);
    
    // Verify that the client is assigned to this trainer
    const trainerClients = await storage.getTrainerClients(trainerId);
    const isClientOfTrainer = trainerClients.some(tc => tc.client.id === clientId);
    
    if (!isClientOfTrainer) {
      return res.status(403).json({ message: 'You are not authorized to view plans for this client' });
    }
    
    // Get nutrition plans for this client created by this trainer
    const plans = await storage.getTrainerNutritionPlans(trainerId);
    const clientPlans = plans.filter(plan => plan.clientId === clientId);
    
    res.json(clientPlans);
  } catch (error) {
    console.error('Error getting client nutrition plans:', error);
    res.status(500).json({ message: 'Failed to retrieve client nutrition plans' });
  }
});

// === FITNESS PLANS ROUTES ===

// Get all fitness plans created by a trainer
router.get('/fitness-plans', async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const plans = await storage.getTrainerFitnessPlans(trainerId);
    res.json(plans);
  } catch (error) {
    console.error('Error getting trainer fitness plans:', error);
    res.status(500).json({ message: 'Failed to retrieve fitness plans' });
  }
});

// Get a specific fitness plan by ID
router.get('/fitness-plans/:id', async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const plan = await storage.getTrainerFitnessPlan(planId);
    
    if (!plan) {
      return res.status(404).json({ message: 'Fitness plan not found' });
    }
    
    // Check if the requesting trainer is the creator of the plan
    if (plan.trainerId !== req.user!.id) {
      return res.status(403).json({ message: 'You are not authorized to view this plan' });
    }
    
    res.json(plan);
  } catch (error) {
    console.error('Error getting fitness plan:', error);
    res.status(500).json({ message: 'Failed to retrieve fitness plan' });
  }
});

// Create a new fitness plan
router.post('/fitness-plans', async (req, res) => {
  try {
    const trainerId = req.user!.id;
    
    // Validate request body
    const validatedData = insertTrainerFitnessPlanSchema.parse({
      ...req.body,
      trainerId
    });
    
    // Create fitness plan
    const newPlan = await storage.createTrainerFitnessPlan(validatedData);
    res.status(201).json(newPlan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid fitness plan data', errors: error.errors });
    }
    console.error('Error creating fitness plan:', error);
    res.status(500).json({ message: 'Failed to create fitness plan' });
  }
});

// Update a fitness plan
router.patch('/fitness-plans/:id', async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const existingPlan = await storage.getTrainerFitnessPlan(planId);
    
    if (!existingPlan) {
      return res.status(404).json({ message: 'Fitness plan not found' });
    }
    
    // Check if the requesting trainer is the creator of the plan
    if (existingPlan.trainerId !== req.user!.id) {
      return res.status(403).json({ message: 'You are not authorized to update this plan' });
    }
    
    // Partial validation of request body
    const validatedData = insertTrainerFitnessPlanSchema.partial().parse(req.body);
    
    // Ensure meal plan has weeklyMeals structure for client meal logging compatibility
    if (req.body.mealPlan && req.body.mealPlan.dailyMeals && !req.body.mealPlan.weeklyMeals) {
      // Create weeklyMeals structure from dailyMeals
      const weeklyMeals = {};
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      days.forEach(day => {
        weeklyMeals[day] = { ...req.body.mealPlan.dailyMeals };
      });
      
      // Update the meal plan with weeklyMeals structure
      req.body.mealPlan.weeklyMeals = weeklyMeals;
      validatedData.mealPlan = req.body.mealPlan;
    }
    
    // Update fitness plan
    const updatedPlan = await storage.updateTrainerFitnessPlan(planId, validatedData);
    
    // We'll keep the meal plan structure in the fitness plan, but won't auto-create meal entries
    // This allows the client to log their meals themselves
    console.log(`Updated fitness plan ${planId} with meal plan structure for client ${existingPlan.clientId}`);
    
    // Note: We removed the automatic client meal entry creation here so clients can log manually
    
    res.json(updatedPlan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid fitness plan data', errors: error.errors });
    }
    console.error('Error updating fitness plan:', error);
    res.status(500).json({ message: 'Failed to update fitness plan' });
  }
});

// This delete endpoint is implemented below

// Get fitness plans for a specific client
router.get('/clients/:clientId/fitness-plans', async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const clientId = parseInt(req.params.clientId);
    
    // Verify that the client is assigned to this trainer
    const trainerClients = await storage.getTrainerClients(trainerId);
    const isClientOfTrainer = trainerClients.some(tc => tc.client.id === clientId);
    
    if (!isClientOfTrainer) {
      return res.status(403).json({ message: 'You are not authorized to view plans for this client' });
    }
    
    // Get fitness plans for this client created by this trainer
    const plans = await storage.getTrainerFitnessPlans(trainerId);
    const clientPlans = plans.filter(plan => plan.clientId === clientId);
    
    res.json(clientPlans);
  } catch (error) {
    console.error('Error getting client fitness plans:', error);
    res.status(500).json({ message: 'Failed to retrieve client fitness plans' });
  }
});

// Delete fitness plan for a specific client
router.delete('/clients/:clientId/fitness-plans/:planId', async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const clientId = parseInt(req.params.clientId);
    const planId = parseInt(req.params.planId);
    
    if (isNaN(planId) || isNaN(clientId)) {
      return res.status(400).json({ message: 'Invalid client ID or plan ID' });
    }
    
    console.log(`Trainer ${trainerId} attempting to delete client ${clientId}'s fitness plan ${planId}`);
    
    // Verify that the client is assigned to this trainer
    const trainerClients = await storage.getTrainerClients(trainerId);
    const isClientOfTrainer = trainerClients.some(tc => tc.client.id === clientId);
    
    if (!isClientOfTrainer) {
      return res.status(403).json({ message: 'You are not authorized to manage this client' });
    }
    
    // First, check for a trainer-created fitness plan
    const trainerPlan = await storage.getTrainerFitnessPlan(planId);
    
    if (trainerPlan) {
      // Verify this trainer created the plan and it belongs to the specified client
      if (trainerPlan.trainerId !== trainerId) {
        return res.status(403).json({ message: 'You are not authorized to delete this plan' });
      }
      
      if (trainerPlan.clientId !== clientId) {
        return res.status(403).json({ message: 'This plan does not belong to the specified client' });
      }
      
      // Clear associated data for this client
      console.log(`Clearing planned meals and future workouts for client ${clientId} before deleting trainer plan`);
      await clearClientPlannedMeals(clientId);
      await clearClientWorkouts(clientId);
      
      // Delete the trainer plan
      const success = await storage.deleteTrainerFitnessPlan(planId);
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete trainer fitness plan' });
      }
      
      console.log(`Successfully deleted trainer fitness plan ${planId} for client ${clientId}`);
      return res.status(204).end();
    }
    
    // If no trainer plan found, check for a regular fitness plan (legacy support)
    const regularPlan = await storage.getFitnessPlan(planId);
    if (!regularPlan) {
      console.log(`No fitness plan found with ID ${planId} in either table`);
      return res.status(404).json({ message: 'Fitness plan not found' });
    }
    
    // Verify the plan belongs to this client
    if (regularPlan.userId !== clientId) {
      return res.status(403).json({ message: 'This plan does not belong to the specified client' });
    }
    
    // Clear associated data for this client
    console.log(`Clearing planned meals and future workouts for client ${clientId} before deleting regular plan`);
    await clearClientPlannedMeals(clientId);
    await clearClientWorkouts(clientId);
    
    // Delete the regular plan
    const success = await storage.deleteFitnessPlan(planId);
    if (!success) {
      return res.status(500).json({ message: 'Failed to delete regular fitness plan' });
    }
    
    console.log(`Successfully deleted regular fitness plan ${planId} for client ${clientId}`);
    return res.status(204).end();
  } catch (error) {
    console.error('Error deleting client fitness plan:', error);
    res.status(500).json({ message: 'Failed to delete fitness plan' });
  }
});

// Create a fitness plan for a client
router.post('/clients/:clientId/fitness-plan', async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const clientId = parseInt(req.params.clientId);
    
    // Verify that the client is assigned to this trainer
    const trainerClients = await storage.getTrainerClients(trainerId);
    const isClientOfTrainer = trainerClients.some(tc => tc.client.id === clientId);
    
    if (!isClientOfTrainer) {
      return res.status(403).json({ message: 'You are not authorized to create a plan for this client' });
    }
    
    // Extract and validate data from request body
    const { name, goal, durationWeeks, description, level, workoutPlan, mealPlan, calculateNutritionGoals } = req.body;
    
    if (!name || !workoutPlan || !mealPlan) {
      return res.status(400).json({ message: 'Missing required fields: name, workoutPlan, and mealPlan are required' });
    }
    
    try {
      // For trainer-related plans, we'll only save them in the trainer_fitness_plans table
      // Create the trainer fitness plan
      const trainerFitnessPlan = await storage.createTrainerFitnessPlan({
        trainerId: trainerId,
        clientId: clientId,
        name: name,
        description: description || `Fitness plan for ${goal || 'general fitness'}`,
        workoutPlan: workoutPlan,
        mealPlan: mealPlan,
        isActive: true,
        notes: `Duration: ${durationWeeks || 4} weeks, Level: ${level || 'beginner'}`
      });
      
      console.log(`Trainer ${trainerId} created a new fitness plan for client ${clientId}. Trainer plan ID: ${trainerFitnessPlan.id}`);
      
      // Prepare the response data
      const newPlan = trainerFitnessPlan;
      
      // If trainer requested nutrition goals calculation, update the client's nutrition goals
      if (calculateNutritionGoals && mealPlan.dailyMeals) {
        try {
          // Calculate nutrition totals from meal plan
          let dailyCalories = 0;
          let dailyProtein = 0;
          let dailyCarbs = 0;
          let dailyFat = 0;
          
          // Sum up all meal nutrients
          const meals = mealPlan.dailyMeals;
          if (meals.breakfast) {
            dailyCalories += meals.breakfast.calories || 0;
            dailyProtein += meals.breakfast.protein || 0;
            dailyCarbs += meals.breakfast.carbs || 0;
            dailyFat += meals.breakfast.fat || 0;
          }
          
          if (meals.lunch) {
            dailyCalories += meals.lunch.calories || 0;
            dailyProtein += meals.lunch.protein || 0;
            dailyCarbs += meals.lunch.carbs || 0;
            dailyFat += meals.lunch.fat || 0;
          }
          
          if (meals.dinner) {
            dailyCalories += meals.dinner.calories || 0;
            dailyProtein += meals.dinner.protein || 0;
            dailyCarbs += meals.dinner.carbs || 0;
            dailyFat += meals.dinner.fat || 0;
          }
          
          if (meals.snacks && Array.isArray(meals.snacks)) {
            for (const snack of meals.snacks) {
              dailyCalories += snack.calories || 0;
              dailyProtein += snack.protein || 0;
              dailyCarbs += snack.carbs || 0;
              dailyFat += snack.fat || 0;
            }
          }
          
          // Handle custom meals if they exist
          if (meals.customMeals && Array.isArray(meals.customMeals)) {
            for (const customMeal of meals.customMeals) {
              dailyCalories += customMeal.calories || 0;
              dailyProtein += customMeal.protein || 0;
              dailyCarbs += customMeal.carbs || 0;
              dailyFat += customMeal.fat || 0;
            }
          }
          
          // Update client's nutrition goals
          await storage.setNutritionGoal(clientId, {
            caloriesTarget: Math.round(dailyCalories),
            proteinTarget: Math.round(dailyProtein),
            carbsTarget: Math.round(dailyCarbs),
            fatTarget: Math.round(dailyFat)
          });
          
          console.log(`Updated nutrition goals for client ${clientId} based on meal plan`);
        } catch (nutritionError) {
          console.error('Error setting nutrition goals:', nutritionError);
          // Don't fail the whole request if just the nutrition goal setting fails
        }
      }
      
      // Send a notification to the client via WebSocket if they're online
      const message = {
        type: 'fitness_plan_assigned',
        timestamp: new Date().toISOString(),
        data: {
          planId: newPlan.id,
          trainerId,
          message: `Your trainer has created a new fitness plan for you.`
        }
      };
      
      // Use WebSocket service to send the notification
      if (global.wss) {
        // Use WebSocket class imported at the top of file
        // Convert Set to Array to avoid TypeScript iteration issues
        const connectedClients = Array.from(global.wss.clients);
        for (const client of connectedClients) {
          // Check if client is open using WebSocket.OPEN state
          if (client.readyState === WebSocket.OPEN && (client as any).userId === clientId) {
            client.send(JSON.stringify(message));
            console.log(`WebSocket notification sent to client ${clientId} about new fitness plan`);
            break;
          }
        }
      }
      
      // Create client workout and meal entries based on the fitness plan
      try {
        // Process workout plan data and create client workout entries
        await createClientWorkoutsFromPlan(clientId, workoutPlan, trainerFitnessPlan.id);
        
        // Process meal plan data and create client meal entries
        await createClientMealsFromPlan(clientId, mealPlan, trainerFitnessPlan.id);
        
        console.log(`Successfully created workout and meal entries for client ${clientId} from plan ${trainerFitnessPlan.id}`);
      } catch (error) {
        console.error('Error creating client workout/meal entries from plan:', error);
        // Don't return an error, as the plan was still successfully created
      }
      
      return res.status(201).json(trainerFitnessPlan);
    } catch (error) {
      console.error('Error creating fitness plan:', error);
      return res.status(500).json({ message: 'Failed to create fitness plan', error: String(error) });
    }
  } catch (error) {
    console.error('Error creating fitness plan:', error);
    return res.status(500).json({ message: 'Failed to create fitness plan', error: String(error) });
  }
});

// Get workouts for a specific client
router.get('/clients/:clientId/workouts', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const trainerId = req.user!.id;
    
    // Get the trainer's clients to verify relationship
    const clients = await storage.getTrainerClients(trainerId);
    const clientRelationship = clients.some(tc => tc.client.id === clientId);
    
    if (!clientRelationship) {
      return res.status(403).json({ message: "This client is not assigned to you" });
    }
    
    // Get client workouts
    const clientWorkouts = await storage.getWorkouts(clientId);
    
    // Get exercises for each workout
    const workoutsWithExercises = await Promise.all(
      clientWorkouts.map(async (workout) => {
        const exercises = await storage.getExercisesByWorkout(workout.id);
        return {
          ...workout,
          exercises
        };
      })
    );
    
    res.status(200).json(workoutsWithExercises);
  } catch (error) {
    console.error("Error fetching client workouts:", error);
    res.status(500).json({ message: "Failed to fetch client workouts" });
  }
});

// Create workout for a specific client
router.post('/clients/:clientId/workouts', async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const clientId = parseInt(req.params.clientId);
    
    console.log(`Trainer ${trainerId} creating workout for client ${clientId}`);
    console.log("Request body:", JSON.stringify(req.body));
    
    // Verify that this client is assigned to this trainer
    const clients = await storage.getTrainerClients(trainerId);
    const clientRelationship = clients.some(tc => tc.client.id === clientId);
    
    if (!clientRelationship) {
      return res.status(403).json({ message: "This client is not assigned to you" });
    }
    
    // Extract workout data and exercises from request body
    const { exercises = [], ...workoutData } = req.body;
    
    console.log("Extracted workout data:", JSON.stringify(workoutData));
    console.log("Extracted exercises:", JSON.stringify(exercises));
    console.log("Client ID:", clientId, "Type:", typeof clientId);
    
    // Properly parse the date
    let dateObj;
    try {
      dateObj = new Date(workoutData.date);
      console.log("Date conversion successful:", dateObj.toISOString());
    } catch (e) {
      console.error("Error converting date:", e);
      dateObj = new Date(); // Use current date as fallback
    }

    // Ensure we have a valid date object
    const workout = await storage.createWorkout(clientId, {
      name: workoutData.name,
      date: dateObj,
      duration: parseInt(workoutData.duration.toString()),
      notes: workoutData.notes || ""
    });
    console.log("Created workout:", JSON.stringify(workout));
    
    // Create exercises for the workout
    const createdExercises = await Promise.all(
      exercises.map(async (exercise: any) => {
        return storage.createExercise({
          ...exercise,
          workoutId: workout.id
        });
      })
    );
    
    // Return the workout with exercises
    res.status(201).json({
      ...workout,
      exercises: createdExercises
    });
    
    // Broadcast to client via WebSocket
    // TODO: Use the WebSocket broadcast function from routes.ts
  } catch (error) {
    console.error("Error creating workout for client:", error);
    res.status(500).json({ message: "Failed to create workout" });
  }
});

// Update workout for a specific client
router.put('/clients/:clientId/workouts/:workoutId', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const workoutId = parseInt(req.params.workoutId);
    const trainerId = req.user!.id;
    
    // Get the trainer's clients to verify relationship
    const clients = await storage.getTrainerClients(trainerId);
    const clientRelationship = clients.some(tc => tc.client.id === clientId);
    
    if (!clientRelationship) {
      return res.status(403).json({ message: "This client is not assigned to you" });
    }
    
    // Verify the workout belongs to this client
    const workout = await storage.getWorkout(workoutId);
    if (!workout || workout.userId !== clientId) {
      return res.status(404).json({ message: "Workout not found for this client" });
    }
    
    // Extract workout data and exercises from request body
    const { exercises = [], ...workoutUpdate } = req.body;
    
    // Update the workout
    const updatedWorkout = await storage.updateWorkout(workoutId, workoutUpdate);
    
    // Get existing exercises for comparison
    const existingExercises = await storage.getExercisesByWorkout(workoutId);
    
    // Track created/updated exercise IDs
    const processedExerciseIds: number[] = [];
    
    // Update or create exercises
    const updatedExercises = await Promise.all(
      exercises.map(async (exercise: any) => {
        if (exercise.id) {
          // Update existing exercise
          const existingExercise = existingExercises.find(e => e.id === exercise.id);
          if (existingExercise) {
            processedExerciseIds.push(exercise.id);
            return storage.updateExercise(exercise.id, exercise);
          }
        }
        
        // Create new exercise
        return storage.createExercise({
          ...exercise,
          workoutId
        });
      })
    );
    
    // Delete exercises that weren't in the update
    await Promise.all(
      existingExercises
        .filter(exercise => !processedExerciseIds.includes(exercise.id))
        .map(exercise => storage.deleteExercise(exercise.id))
    );
    
    // Return the updated workout with exercises
    res.status(200).json({
      ...updatedWorkout,
      exercises: updatedExercises
    });
  } catch (error) {
    console.error("Error updating workout for client:", error);
    res.status(500).json({ message: "Failed to update workout" });
  }
});

// Delete workout for a specific client
router.delete('/clients/:clientId/workouts/:workoutId', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const workoutId = parseInt(req.params.workoutId);
    const trainerId = req.user!.id;
    
    // Get the trainer's clients to verify relationship
    const clients = await storage.getTrainerClients(trainerId);
    const clientRelationship = clients.some(tc => tc.client.id === clientId);
    
    if (!clientRelationship) {
      return res.status(403).json({ message: "This client is not assigned to you" });
    }
    
    // Verify the workout belongs to this client
    const workout = await storage.getWorkout(workoutId);
    if (!workout || workout.userId !== clientId) {
      return res.status(404).json({ message: "Workout not found for this client" });
    }
    
    // Delete the workout (exercises will be deleted automatically due to CASCADE)
    const success = await storage.deleteWorkout(workoutId);
    
    if (!success) {
      return res.status(500).json({ message: "Failed to delete workout" });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting workout for client:", error);
    res.status(500).json({ message: "Failed to delete workout" });
  }
});

// DELETE a fitness plan - all possible routes supported
router.delete(['/fitness-plans/:id', '/trainer/fitness-plans/:id', '/api/trainer/fitness-plans/:id'], async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    if (isNaN(planId)) {
      return res.status(400).json({ message: 'Invalid plan ID' });
    }
    
    const trainerId = req.user?.id;
    if (!trainerId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    console.log(`Trainer ${trainerId} attempting to delete fitness plan ${planId}`);
    
    // First, check for a trainer-created fitness plan
    const trainerPlan = await storage.getTrainerFitnessPlan(planId);
    
    if (trainerPlan) {
      console.log(`Found trainer fitness plan ${planId}, checking authorization`);
      
      // Verify the trainer is the creator of this plan
      if (trainerPlan.trainerId !== trainerId) {
        return res.status(403).json({ message: 'You are not authorized to delete this plan' });
      }
      
      const clientId = trainerPlan.clientId;
      
      // Clear associated data for this client
      console.log(`Clearing planned meals and future workouts for client ${clientId} before deleting trainer plan`);
      await clearClientPlannedMeals(clientId);
      await clearClientWorkouts(clientId);
      
      // Delete the trainer plan
      const success = await storage.deleteTrainerFitnessPlan(planId);
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete trainer fitness plan' });
      }
      
      console.log(`Successfully deleted trainer fitness plan ${planId} for client ${clientId}`);
      return res.status(204).end();
    }
    
    // If no trainer plan found, check for a regular fitness plan (legacy support)
    const regularPlan = await storage.getFitnessPlan(planId);
    if (!regularPlan) {
      console.log(`No fitness plan found with ID ${planId} in either table`);
      return res.status(404).json({ message: 'Fitness plan not found' });
    }
    
    // Verify the client belongs to this trainer
    const clients = await storage.getTrainerClients(trainerId);
    const clientIds = clients.map(tc => tc.client.id);
    
    if (!clientIds.includes(regularPlan.userId)) {
      return res.status(403).json({ message: 'You are not authorized to manage this plan' });
    }
    
    const clientId = regularPlan.userId;
    
    // Clear associated data for this client
    console.log(`Clearing planned meals and future workouts for client ${clientId} before deleting regular plan`);
    await clearClientPlannedMeals(clientId);
    await clearClientWorkouts(clientId);
    
    // Delete the regular plan
    const success = await storage.deleteFitnessPlan(planId);
    if (!success) {
      return res.status(500).json({ message: 'Failed to delete fitness plan' });
    }
    
    console.log(`Successfully deleted regular fitness plan ${planId} for client ${clientId}`);
    
    // Return success with no content
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting fitness plan:', error);
    res.status(500).json({ message: 'Failed to delete fitness plan' });
  }
});

// Get messages for a specific client
router.get('/messages/:clientId', async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const clientId = parseInt(req.params.clientId);
    
    // Verify that there's a trainer-client relationship
    const trainerClients = await storage.getTrainerClients(trainerId);
    const isValidClient = trainerClients.some(tc => tc.client.id === clientId);
    
    if (!isValidClient) {
      return res.status(403).json({ message: 'Not authorized to view messages for this client' });
    }
    
    // Get messages for this trainer-client pair
    const messages = await storage.getTrainerClientMessages(trainerId, clientId);
    
    // Mark messages from client as read
    const messagesToMark = messages
      .filter(m => m.senderId === clientId && !m.isRead)
      .map(m => m.id);
      
    if (messagesToMark.length > 0) {
      await storage.markMessagesAsRead(trainerId, messagesToMark);
    }
    
    res.json(messages);
  } catch (error) {
    console.error('Error getting trainer-client messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

export default router;