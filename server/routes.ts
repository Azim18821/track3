// Global WebSocketServer declaration
declare global {
  var wss: import("ws").WebSocketServer;
}

import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { db } from "./db";
import { z } from "zod";
import { eq, sql, desc, and } from "drizzle-orm";
import { sendPlanReadyEmail, verifyEmailConnection, hasEmailCredentials } from "./emailService";
import multer from 'multer';
import { 
  insertMealSchema, 
  insertWorkoutSchema, 
  insertExerciseSchema, 
  insertWeightSchema, 
  insertNutritionGoalSchema,
  insertFitnessPlanSchema,
  insertGoalSchema,
  insertExerciseLibrarySchema,
  insertMealRecipeSchema,
  insertSavedMealSchema,
  InsertGoal,
  InsertExerciseLibrary,
  InsertFitnessPlan,
  fitnessPlans,
  InsertMealRecipe,
  InsertSavedMeal,
  User,
  trainerClients,
  meals,
  workouts
} from "@shared/schema";
import { getNutritionInfo } from "./openai";
import { extractIngredientsFromMealPlan } from "../utils/openai";
import OpenAI from "openai";
import { setupAuth, ensureAuthenticated, ensureAdmin, ensureTrainer, setupFirstAdminUser } from "./auth";
import { FitnessPreferences, generateFitnessPlan, convertWorkoutPlanToDatabaseFormat, convertMealPlanToDatabaseFormat } from "./chatbot";
import { chatWithAICoach, analyzeUserProgress, getProgressUpdate, generateAdaptiveFitnessPlan } from './adaptive-coach';
import { updateExercises, updateMeals, updateBothLibraries } from "./adminLibraryUpdates";
import { resetUserPlanCooldown, forceDeactivateFitnessPlan } from "./adminTools";
import adminRoutes from "./adminRoutes";
import passwordResetRoutes from "./passwordResetRoutes";
import onboardingRoutes from "./onboardingRoutes";
import ingredientsRoutes from "./ingredientsRoutes";
import trainerRoutes from "./trainerRoutes";
import { planGenerationStatus } from "@shared/schema";
import { generateCoachResponse, CoachInput } from "./coach";
import {
  getAllMealRecipes,
  getMealRecipeById,
  getFeaturedMealRecipes,
  getMealRecipesByType,
  getMealRecipesByBudget,
  createMealRecipe,
  updateMealRecipe,
  deleteMealRecipe,
  toggleFeaturedRecipe,
  refreshFeaturedRecipes,
  generateRecipe,
} from "./mealRecipes";
import stepRouter from './step-routes';
import pushNotificationRoutes from './pushNotificationRoutes';
import { analyzeFoodImage, RecognizedFood } from './services/foodRecognition';

// Extend the Express Request type to include the user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * WebSocket Management Module
 * 
 * This section handles WebSocket connections for real-time communication
 * between the server and clients. It manages connection lifecycles,
 * authentication, and message broadcasting.
 */

/**
 * WebSocketClient interface defines the structure of a connected client
 */
interface WebSocketClient {
  userId?: number;          // The authenticated user ID (if set)
  ws: WebSocket;            // The WebSocket connection instance
  isAlive: boolean;         // Connection health status flag
  connectedAt: Date;        // When the connection was established
  lastActivity: Date;       // Last activity timestamp
}

// Debug mode flag for verbose WebSocket logging
const WS_DEBUG = process.env.NODE_ENV === 'development';

// Map to store active WebSocket connections
const clients: Map<WebSocket, WebSocketClient> = new Map();

/**
 * Broadcast a message to a specific user across all their active connections
 * 
 * @param userId - The ID of the user to send the message to
 * @param eventType - The type of event being broadcast
 * @param data - The data payload to send
 */
function broadcastToUser(userId: number, eventType: string, data: any) {
  if (WS_DEBUG) console.log(`Broadcasting ${eventType} to user ${userId}`);
  
  let deliveredCount = 0;
  
  for (const client of Array.from(clients.values())) {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      try {
        // Update client activity timestamp
        client.lastActivity = new Date();
        
        // Send the message
        client.ws.send(JSON.stringify({ 
          type: eventType, 
          data,
          timestamp: Date.now()
        }));
        
        deliveredCount++;
      } catch (err) {
        console.error(`Error sending WebSocket message to user ${userId}:`, err);
      }
    }
  }
  
  if (WS_DEBUG && deliveredCount > 0) {
    console.log(`Successfully delivered ${eventType} to ${deliveredCount} connections for user ${userId}`);
  }
}

/**
 * Broadcast a message to all connected clients
 * 
 * @param eventType - The type of event being broadcast
 * @param data - The data payload to send
 * @param excludeUserId - Optional user ID to exclude from the broadcast
 */
function broadcastToAll(eventType: string, data: any, excludeUserId?: number) {
  if (WS_DEBUG) console.log(`Broadcasting ${eventType} to all clients`);
  
  let deliveredCount = 0;
  let skippedCount = 0;
  
  for (const client of Array.from(clients.values())) {
    // Skip excluded user if specified
    if (excludeUserId !== undefined && client.userId === excludeUserId) {
      skippedCount++;
      continue;
    }
    
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        // Update client activity timestamp
        client.lastActivity = new Date();
        
        // Send the message
        client.ws.send(JSON.stringify({ 
          type: eventType, 
          data,
          timestamp: Date.now()
        }));
        
        deliveredCount++;
      } catch (err) {
        console.error('Error broadcasting WebSocket message:', err);
      }
    }
  }
  
  if (WS_DEBUG) {
    console.log(`Broadcast stats: ${deliveredCount} delivered, ${skippedCount} excluded`);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for monitoring (used by Render)
  app.get("/api/health", (req: Request, res: Response) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });
  
  // Set up authentication
  setupAuth(app);
  
  // Create initial admin user if needed
  await setupFirstAdminUser();
  
  // Register admin routes for library updates
  app.use('/api/admin', adminRoutes);
  
  // Register password reset routes
  app.use('/api/password-reset', passwordResetRoutes);
  
  // Register ingredients extraction routes for /api/ingredients/extract
  app.use('/api/ingredients', ingredientsRoutes);
  
  // Register onboarding routes 
  app.use('/api/onboarding', onboardingRoutes);
  
  // Register step-by-step plan generation routes
  app.use('/api/step-coach', stepRouter);
  
  // Register push notification routes
  app.use('/api/push-notifications', pushNotificationRoutes);
  
  // Register trainer routes for managing client nutrition and fitness plans
  app.use('/api/trainer', trainerRoutes);
  
  // Food image recognition endpoint
  app.post('/api/food/recognize', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { imageBase64 } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ 
          message: "Missing image data. Please provide a base64-encoded image." 
        });
      }
      
      console.log("Processing food image recognition request");
      
      // Check if required API keys are configured
      if (!process.env.GOOGLE_CLOUD_VISION_API_KEY || !process.env.NUTRITIONIX_APP_ID || !process.env.NUTRITIONIX_API_KEY) {
        return res.status(500).json({
          message: "Food recognition services are not properly configured. Missing required API keys.",
          missingKeys: {
            googleVision: !process.env.GOOGLE_CLOUD_VISION_API_KEY,
            nutritionixAppId: !process.env.NUTRITIONIX_APP_ID,
            nutritionixApiKey: !process.env.NUTRITIONIX_API_KEY
          }
        });
      }
      
      // Use the analyzeFoodImage service to process the image
      const recognizedFoods = await analyzeFoodImage(imageBase64);
      
      return res.status(200).json({
        success: true,
        foods: recognizedFoods
      });
    } catch (error) {
      console.error("Error recognizing food from image:", error);
      return res.status(500).json({
        message: "Failed to analyze food image",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // API endpoint to check fitness plan generation progress
  app.get('/api/fitness-plans/generation-progress', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('[PROGRESS DEBUG] Checking plan generation progress');
      console.log('[PROGRESS DEBUG] Authentication status:', {
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        userId: req.user?.id,
        requestHasCookies: !!req.headers.cookie,
        cookieLength: req.headers.cookie?.length || 0
      });
      
      const userId = req.user!.id;
      console.log(`[PROGRESS DEBUG] Checking progress for user ID: ${userId}`);
      
      // Get the current generation status from the database
      const status = await db.select()
        .from(planGenerationStatus)
        .where(eq(planGenerationStatus.userId, userId))
        .limit(1);
      
      // If no status record exists, return not generating
      if (!status || status.length === 0) {
        console.log(`[Plan Generation] No generation status found for user ${userId}`);
        return res.status(200).json({
          isGenerating: false,
          message: "No plan generation in progress"
        });
      }
      
      // Return the generation status
      console.log(`[Plan Generation] Status for user ${userId}:`, status[0]);
      return res.status(200).json(status[0]);
      
    } catch (error) {
      console.error(`[Plan Generation] Error checking generation progress:`, error);
      return res.status(500).json({
        message: "Error checking plan generation status",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Generate shopping list and calculate budget for a fitness plan
  app.post("/api/fitness-plans/:planId/calculate-budget", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.planId);
      const userId = req.user!.id;
      
      console.log(`Generating shopping list for fitness plan ID: ${planId}`);
      
      // Get the fitness plan
      const plan = await storage.getFitnessPlan(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Fitness plan not found" });
      }
      
      // Make sure the plan belongs to the user or they are an admin
      if (plan.userId !== userId && !req.user!.isAdmin) {
        return res.status(403).json({ message: "Not authorized to access this plan" });
      }
      
      if (!plan.mealPlan) {
        return res.status(400).json({ message: "Meal plan data is missing in the fitness plan" });
      }
      
      // Extract ingredients using OpenAI
      const shoppingList = await extractIngredientsFromMealPlan(plan.mealPlan);
      
      // Update the fitness plan with the shopping list
      const updatedPlan = await db.update(fitnessPlans)
        .set({
          preferences: {
            ...plan.preferences,
            shoppingList: shoppingList
          }
        })
        .where(eq(fitnessPlans.id, planId))
        .returning();
      
      if (!updatedPlan || updatedPlan.length === 0) {
        return res.status(500).json({ message: "Failed to update fitness plan with shopping list" });
      }
      
      return res.status(200).json({
        success: true,
        message: "Shopping list generated successfully", 
        shoppingList
      });
    } catch (error: any) {
      console.error('Error generating shopping list:', error);
      return res.status(500).json({ 
        message: 'Failed to generate shopping list',
        error: error.message || 'Unknown error'
      });
    }
  });
  
  // TEMPORARY: Special route to reset cooldown for testing meal plan improvements
  app.post('/api/admin/reset-cooldown/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Call the admin function to reset the cooldown
      const success = await resetUserPlanCooldown(userId);
      
      if (success) {
        console.log(`ADMIN ACTION: Reset plan cooldown for user ${userId}`);
        return res.status(200).json({ 
          message: "Plan cooldown reset successfully",
          success: true
        });
      } else {
        return res.status(500).json({ 
          message: "Failed to reset plan cooldown",
          success: false
        });
      }
    } catch (error) {
      console.error("Error resetting plan cooldown:", error);
      return res.status(500).json({ 
        message: "Internal server error",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Create OpenAI client
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Text-to-speech voiceover generation endpoint
  app.post("/api/generate-voiceover", async (req: Request, res: Response) => {
    try {
      const { text, voice = "nova" } = req.body;
      
      if (!text || text.trim().length === 0) {
        return res.status(400).json({ message: "Text is required" });
      }
      
      // Validate voice parameter (only allow specific OpenAI voices)
      const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
      if (!validVoices.includes(voice)) {
        return res.status(400).json({ message: "Invalid voice parameter" });
      }
      
      console.log(`Generating voiceover with voice: ${voice}`);
      
      // Generate speech using OpenAI
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice as any,
        input: text,
        speed: 1.0,
      });
      
      // Convert to buffer
      const buffer = Buffer.from(await mp3.arrayBuffer());
      
      // Set response headers
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length,
      });
      
      // Send the audio data
      res.send(buffer);
    } catch (error) {
      console.error("Error generating voiceover:", error);
      res.status(500).json({ 
        message: "Failed to generate voiceover", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Update user profile with demographic info
  app.patch('/api/profile', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Define a schema for profile updates
      const profileUpdateSchema = z.object({
        email: z.string().email().optional(),
        dateOfBirth: z.string().transform(val => val ? new Date(val) : null).optional(),
        gender: z.string().optional().nullable(),
        height: z.number().optional().nullable(),
        weight: z.number().optional().nullable(),
        heightUnit: z.enum(['cm', 'inches']).optional(),
        weightUnit: z.enum(['kg', 'lb']).optional(),
        fitnessGoal: z.enum(['weightLoss', 'muscleBuild', 'stamina', 'strength']).optional().nullable()
      });
      
      // Validate request body
      const validationResult = profileUpdateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid profile data", 
          errors: validationResult.error.errors 
        });
      }
      
      const profileData = validationResult.data;
      
      // If weight is provided, log it
      if (profileData.weight) {
        try {
          await storage.createWeight({
            userId,
            weight: profileData.weight,
            unit: profileData.weightUnit || 'kg'
          });
          console.log(`Logged weight ${profileData.weight} ${profileData.weightUnit || 'kg'} for user ${userId}`);
        } catch (weightError) {
          console.error("Error logging weight:", weightError);
          // Continue with profile update even if weight logging fails
        }
      }
      
      // Update user profile
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ 
        message: "Failed to update profile", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Get weights endpoint
  app.get('/api/weights', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const weights = await storage.getWeights(userId);
      res.json(weights);
    } catch (error) {
      console.error("Error fetching weights:", error);
      res.status(500).json({ 
        message: "Failed to fetch weight history", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Log weight endpoint
  app.post('/api/weights', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Define schema for weight logging
      const weightSchema = z.object({
        weight: z.number().positive("Weight must be positive"),
        unit: z.enum(['kg', 'lb']).default('kg'),
        date: z.string().transform(val => new Date(val)).optional()
      });
      
      // Validate request body
      const validationResult = weightSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid weight data", 
          errors: validationResult.error.errors 
        });
      }
      
      const weightData = validationResult.data;
      
      // Create weight entry
      const weight = await storage.createWeight({
        userId,
        weight: weightData.weight,
        unit: weightData.unit,
        date: weightData.date
      });
      
      res.status(201).json(weight);
    } catch (error) {
      console.error("Error logging weight:", error);
      res.status(500).json({ 
        message: "Failed to log weight", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server on path /ws and make it globally accessible
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Assign to global scope for access from other modules (e.g., trainer routes)
  // @ts-ignore - Ignoring TypeScript error since we're using global as an indexed object
  global.wss = wss;
  
  /**
   * WebSocket connection handler
   * This handles new client connections, setup, and lifecycle management
   */
  wss.on('connection', (ws: WebSocket, req: any) => {
    // Get client IP for logging
    const ip = req.socket.remoteAddress || 'unknown';
    if (WS_DEBUG) console.log(`New WebSocket connection from ${ip}`);
    
    // Initialize current timestamp
    const now = new Date();
    
    // Create a properly typed client object
    const newClient: WebSocketClient = { 
      ws, 
      isAlive: true,
      connectedAt: now,
      lastActivity: now
    };
    
    // Add the client to our map with default values
    clients.set(ws, newClient);
    
    // Log connection count
    if (WS_DEBUG) console.log(`Active WebSocket connections: ${clients.size}`);
    
    /**
     * Handle pong responses for connection health monitoring
     */
    ws.on('pong', () => {
      const client = clients.get(ws);
      if (client) {
        client.isAlive = true;
        client.lastActivity = new Date();
      }
    });
    
    // Handle authentication and other messages from client
    ws.on('message', async (message: string) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        
        // Handle auth message to associate session with WebSocket
        if (parsedMessage.type === 'auth' && parsedMessage.token) {
          const sessionToken = parsedMessage.token;
          
          // This is a simple example - in production, validate the token properly
          // For now, we'll assume the token is a user ID for simplicity
          const userId = parseInt(parsedMessage.token);
          if (!isNaN(userId)) {
            const client = clients.get(ws);
            if (client) {
              client.userId = userId;
              console.log(`WebSocket authenticated for user ${userId}`);
              ws.send(JSON.stringify({ type: 'auth_success', userId }));
            }
          } else {
            console.log('Invalid auth token received:', sessionToken);
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid authentication token' }));
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle disconnect
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });
  
  // Set up a ping interval to keep connections alive and detect dead clients
  const pingInterval = setInterval(() => {
    for (const [ws, client] of Array.from(clients.entries())) {
      if (!client.isAlive) {
        console.log('Terminating inactive WebSocket connection');
        clients.delete(ws);
        ws.terminate();
        continue;
      }
      
      client.isAlive = false;
      try {
        ws.ping();
      } catch (error) {
        console.error('Error pinging client:', error);
        clients.delete(ws);
      }
    }
  }, 30000); // Check every 30 seconds
  
  // Clean up on server close
  wss.on('close', () => {
    clearInterval(pingInterval);
  });
  // Nutrition API endpoints
  app.get("/api/nutrition/meals", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      let meals;
      
      if (req.query.date) {
        const date = new Date(req.query.date as string);
        meals = await storage.getMealsByDate(userId, date);
      } else {
        meals = await storage.getMeals(userId);
      }
      
      res.json(meals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meals" });
    }
  });

  app.post("/api/nutrition/meals", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      console.log("Creating meal for user:", userId);
      console.log("Received meal data:", req.body);
      
      // Create a custom validation schema for meal data
      const customMealSchema = z.object({
        name: z.string().min(1, "Food name is required"),
        mealType: z.string().min(1, "Meal type is required"),
        servingSize: z.coerce.number().positive("Serving size must be positive"),
        servingUnit: z.string().min(1, "Serving unit is required"),
        calories: z.coerce.number().nonnegative("Calories cannot be negative"),
        protein: z.coerce.number().nonnegative("Protein cannot be negative"),
        carbs: z.coerce.number().nonnegative("Carbs cannot be negative"),
        fat: z.coerce.number().nonnegative("Fat cannot be negative"),
        date: z.union([z.string(), z.date()]).optional(),
      });
      
      // Preprocess data for validation
      const preprocessedData = { ...req.body };
      
      // Ensure the date is properly set
      if (!preprocessedData.date) {
        preprocessedData.date = new Date();
      } else if (typeof preprocessedData.date === 'string') {
        preprocessedData.date = new Date(preprocessedData.date);
      }
      
      console.log("Preprocessed meal data:", preprocessedData);
      
      // Log the schema for debugging
      console.log("Custom schema keys:", Object.keys(customMealSchema.shape));
      
      // Validate with our custom schema
      const validatedData = customMealSchema.parse(preprocessedData);
      console.log("Validated meal data:", validatedData);
      
      // Create the meal in storage
      // Ensure date is a proper Date object before sending to storage
      const mealWithProperDate = {
        ...validatedData,
        date: validatedData.date instanceof Date ? validatedData.date : new Date(validatedData.date || new Date())
      };
      const newMeal = await storage.createMeal(userId, mealWithProperDate);
      console.log("Created new meal:", newMeal);
      
      // Broadcast the new meal to the user
      broadcastToUser(userId, 'meal_created', newMeal);
      
      res.status(201).json(newMeal);
    } catch (error: unknown) {
      console.error("Error creating meal:", error);
      
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        res.status(400).json({ 
          message: "Invalid meal data", 
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        // Handle unknown errors
        let errorMessage = "Failed to create meal";
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        res.status(500).json({ message: "Failed to create meal", error: errorMessage });
      }
    }
  });

  app.put("/api/nutrition/meals/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get the meal to check ownership
      const meal = await storage.getMeal(id);
      
      if (!meal) {
        return res.status(404).json({ message: "Meal not found" });
      }
      
      // Ensure the user owns this meal entry
      if (meal.userId !== userId && !req.user!.isAdmin) {
        return res.status(403).json({ message: "You don't have permission to update this meal" });
      }
      
      const mealData = insertMealSchema.partial().parse(req.body);
      const updatedMeal = await storage.updateMeal(id, mealData);
      
      if (!updatedMeal) {
        return res.status(404).json({ message: "Meal not found" });
      }
      
      // Broadcast meal update through WebSocket
      broadcastToUser(userId, 'meal_updated', updatedMeal);
      
      res.json(updatedMeal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid meal data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update meal" });
      }
    }
  });

  app.delete("/api/nutrition/meals/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get the meal to check ownership
      const meal = await storage.getMeal(id);
      
      if (!meal) {
        return res.status(404).json({ message: "Meal not found" });
      }
      
      // Ensure the user owns this meal entry
      if (meal.userId !== userId && !req.user!.isAdmin) {
        return res.status(403).json({ message: "You don't have permission to delete this meal" });
      }
      
      const success = await storage.deleteMeal(id);
      
      if (!success) {
        return res.status(404).json({ message: "Meal not found" });
      }
      
      // Broadcast meal deletion through WebSocket
      broadcastToUser(userId, 'meal_deleted', { id });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting meal:", error);
      res.status(500).json({ message: "Failed to delete meal" });
    }
  });

  // Workout API endpoints
  app.get("/api/workouts", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      console.log("Fetching workouts for user ID:", userId);
      const workouts = await storage.getWorkouts(userId);
      console.log("Found workouts:", workouts.length);
      
      if (workouts.length > 0) {
        console.log("Sample workout data:", JSON.stringify(workouts[0], null, 2));
      }
      
      // Enhance workouts with exercise data
      const enhancedWorkouts = await Promise.all(workouts.map(async (workout) => {
        try {
          const exercises = await storage.getExercisesByWorkout(workout.id);
          console.log(`Workout ${workout.id} has ${exercises.length} exercises`);
          return { ...workout, exercises };
        } catch (exerciseError) {
          console.error("Error fetching exercises for workout:", workout.id, exerciseError);
          // Return workout without exercises if fetching exercises fails
          return { ...workout, exercises: [] };
        }
      }));
      
      console.log("Sending enhanced workouts:", enhancedWorkouts.length);
      res.json(enhancedWorkouts);
    } catch (error) {
      console.error("Error fetching workouts:", error);
      res.status(500).json({ message: "Failed to fetch workouts" });
    }
  });

  app.get("/api/workouts/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const workout = await storage.getWorkout(id);
      
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // Check if the workout belongs to the authenticated user
      if (workout.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied: This workout belongs to another user" });
      }
      
      const exercises = await storage.getExercisesByWorkout(workout.id);
      res.json({ ...workout, exercises });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch workout" });
    }
  });

  app.post("/api/workouts", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Validate and extract workout data
      const { exercises, ...workoutData } = req.body;
      
      // Convert string date to Date object if it's a string
      const processedWorkoutData = {
        ...workoutData,
        date: workoutData.date ? new Date(workoutData.date) : new Date()
      };
      
      const validWorkoutData = insertWorkoutSchema.parse(processedWorkoutData);
      
      // Create workout
      const newWorkout = await storage.createWorkout(userId, validWorkoutData);
      
      // Create exercises if provided
      const savedExercises = [];
      if (Array.isArray(exercises)) {
        for (const exercise of exercises) {
          const validExerciseData = insertExerciseSchema.parse({
            ...exercise,
            workoutId: newWorkout.id
          });
          const savedExercise = await storage.createExercise(validExerciseData);
          savedExercises.push(savedExercise);
        }
      }
      
      // Prepare the complete workout object with exercises
      const completeWorkout = { ...newWorkout, exercises: savedExercises };
      
      // Broadcast the new workout to the user
      broadcastToUser(userId, 'workout_created', completeWorkout);
      
      res.status(201).json(completeWorkout);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid workout data", errors: error.errors });
      } else {
        console.error("Workout creation error:", error);
        res.status(500).json({ message: "Failed to create workout" });
      }
    }
  });

  app.put("/api/workouts/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // First check if the workout exists and belongs to the user
      const existingWorkout = await storage.getWorkout(id);
      if (!existingWorkout) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // Check if the workout belongs to the authenticated user
      if (existingWorkout.userId !== userId) {
        return res.status(403).json({ message: "Access denied: This workout belongs to another user" });
      }
      
      const { exercises, ...workoutData } = req.body;
      
      // Process date if present
      const processedWorkoutData = {
        ...workoutData
      };
      
      if (workoutData.date) {
        processedWorkoutData.date = new Date(workoutData.date);
      }
      
      // Update workout
      const validWorkoutData = insertWorkoutSchema.partial().parse(processedWorkoutData);
      const updatedWorkout = await storage.updateWorkout(id, validWorkoutData);
      
      if (!updatedWorkout) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // If exercises are provided, update or add them
      if (Array.isArray(exercises)) {
        for (const exercise of exercises) {
          if (exercise.id) {
            // Update existing exercise
            const { id: exerciseId, ...exerciseData } = exercise;
            await storage.updateExercise(exerciseId, exerciseData);
          } else {
            // Add new exercise
            await storage.createExercise({
              ...exercise,
              workoutId: id
            });
          }
        }
      }
      
      // Get updated exercises
      const updatedExercises = await storage.getExercisesByWorkout(id);
      
      // Create the complete updated workout object with exercises
      const completeWorkout = { ...updatedWorkout, exercises: updatedExercises };
      
      // Broadcast workout update through WebSocket
      broadcastToUser(userId, 'workout_updated', completeWorkout);
      
      res.json(completeWorkout);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid workout data", errors: error.errors });
      } else {
        console.error("Workout update error:", error);
        res.status(500).json({ message: "Failed to update workout" });
      }
    }
  });

  app.delete("/api/workouts/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // First check if the workout exists and belongs to the user
      const workout = await storage.getWorkout(id);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // Check if the workout belongs to the authenticated user
      if (workout.userId !== userId && !req.user!.isAdmin) {
        return res.status(403).json({ message: "Access denied: This workout belongs to another user" });
      }
      
      const success = await storage.deleteWorkout(id);
      
      if (!success) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // Broadcast workout deletion through WebSocket
      broadcastToUser(userId, 'workout_deleted', { id });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting workout:", error);
      res.status(500).json({ message: "Failed to delete workout" });
    }
  });
  
  // Mark a workout as completed
  app.post("/api/workouts/:id/complete", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const workout = await storage.getWorkout(id);
      
      // Check if workout exists and belongs to user
      if (!workout || workout.userId !== userId) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // Update workout to mark as completed
      const updatedWorkout = await storage.updateWorkout(id, { 
        completed: true 
      });
      
      if (updatedWorkout) {
        const exercises = await storage.getExercisesByWorkout(id);
        const completeWorkout = { ...updatedWorkout, exercises };
        
        // Broadcast workout update through WebSocket
        broadcastToUser(userId, 'workout_updated', completeWorkout);
        
        res.json(completeWorkout);
      } else {
        res.status(404).json({ message: "Workout not found" });
      }
    } catch (error) {
      console.error("Error marking workout as completed:", error);
      res.status(500).json({ message: "Failed to mark workout as completed" });
    }
  });
  
  // Mark a workout as not completed (incomplete)
  app.post("/api/workouts/:id/incomplete", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const workout = await storage.getWorkout(id);
      
      // Check if workout exists and belongs to user
      if (!workout || workout.userId !== userId) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // Update workout to mark as incomplete
      const updatedWorkout = await storage.updateWorkout(id, { 
        completed: false 
      });
      
      if (updatedWorkout) {
        const exercises = await storage.getExercisesByWorkout(id);
        const completeWorkout = { ...updatedWorkout, exercises };
        
        // Broadcast workout update through WebSocket
        broadcastToUser(userId, 'workout_updated', completeWorkout);
        
        res.json(completeWorkout);
      } else {
        res.status(404).json({ message: "Workout not found" });
      }
    } catch (error) {
      console.error("Error marking workout as incomplete:", error);
      res.status(500).json({ message: "Failed to mark workout as incomplete" });
    }
  });

  app.delete("/api/exercises/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get the exercise to check ownership via the workout
      const exercise = await storage.getExercise(id);
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }
      
      // Get the workout that contains this exercise
      const workout = await storage.getWorkout(exercise.workoutId);
      if (!workout) {
        // This would be unusual - an exercise exists but its workout doesn't
        return res.status(404).json({ message: "Workout not found for this exercise" });
      }
      
      // Check if the workout belongs to the authenticated user
      if (workout.userId !== userId && !req.user!.isAdmin) {
        return res.status(403).json({ message: "Access denied: This exercise belongs to another user's workout" });
      }
      
      const success = await storage.deleteExercise(id);
      
      if (!success) {
        return res.status(404).json({ message: "Exercise not found" });
      }
      
      // Broadcast exercise deletion through WebSocket
      // Include workout ID so the client knows which workout to update
      broadcastToUser(userId, 'exercise_deleted', { id, workoutId: exercise.workoutId });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting exercise:", error);
      res.status(500).json({ message: "Failed to delete exercise" });
    }
  });

  // Weight tracking API endpoints
  app.get("/api/weight", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const weights = await storage.getWeights(userId);
      res.json(weights);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weight data" });
    }
  });
  
  app.delete("/api/weight/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get the weight entry to check ownership
      const weight = await storage.getWeight(id);
      
      if (!weight) {
        return res.status(404).json({ message: "Weight entry not found" });
      }
      
      // Ensure the user owns this weight entry
      if (weight.userId !== userId && !req.user!.isAdmin) {
        return res.status(403).json({ message: "You don't have permission to delete this weight entry" });
      }
      
      const success = await storage.deleteWeight(id);
      
      if (!success) {
        return res.status(404).json({ message: "Weight entry not found" });
      }
      
      // Broadcast weight deletion through WebSocket
      broadcastToUser(userId, 'weight_deleted', { id });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting weight entry:", error);
      res.status(500).json({ message: "Failed to delete weight entry" });
    }
  });

  app.post("/api/weight", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      console.log("Raw weight data:", req.body);
      
      // Parse the data with the insertWeightSchema
      const weightData = insertWeightSchema.parse(req.body);
      console.log("Parsed weight data:", weightData);
      
      // Create the weight entry
      const newWeight = await storage.createWeight(userId, weightData);
      
      // Broadcast weight creation through WebSocket
      broadcastToUser(userId, 'weight_created', newWeight);
      
      res.status(201).json(newWeight);
    } catch (error) {
      console.error("Weight entry error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid weight data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create weight entry" });
      }
    }
  });

  // Goals API endpoints
  app.get("/api/goals", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const userGoals = await storage.getGoals(userId);
      res.json(userGoals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.get("/api/goals/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const goalId = parseInt(req.params.id);
      const goal = await storage.getGoal(goalId);
      
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      // Ensure user can only access their own goals
      if (goal.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(goal);
    } catch (error) {
      console.error("Error fetching goal:", error);
      res.status(500).json({ message: "Failed to fetch goal" });
    }
  });

  app.post("/api/goals", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      console.log("Raw goal data:", req.body);
      
      // Process the target date if it's a string
      const preprocessedData = { ...req.body };
      if (typeof preprocessedData.targetDate === 'string') {
        console.log("Converting target date from string:", preprocessedData.targetDate);
      }
      
      // Parse with the schema that handles string dates
      const goalData = insertGoalSchema.parse(preprocessedData);
      console.log("Parsed goal data:", goalData);
      
      const newGoal = await storage.createGoal(userId, goalData);
      console.log("Created new goal:", newGoal);
      
      // Broadcast goal creation through WebSocket
      broadcastToUser(userId, 'goal_created', newGoal);
      
      res.status(201).json(newGoal);
    } catch (error) {
      console.error("Error creating goal:", error);
      
      if (error instanceof z.ZodError) {
        console.error("Goal validation errors:", error.errors);
        res.status(400).json({ message: "Invalid goal data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create goal" });
      }
    }
  });

  app.put("/api/goals/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const goalId = parseInt(req.params.id);
      const goal = await storage.getGoal(goalId);
      
      // Ensure goal exists and belongs to the user
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      if (goal.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Log what we're trying to update
      console.log("Updating goal:", goalId, "with data:", req.body);
      
      // Initialize update data
      let updateData: Partial<InsertGoal> = {};
      
      // Handle progress updates and status updates separately for better compatibility
      if (req.body.progress !== undefined || req.body.completed !== undefined) {
        // For progress/completion updates, only use those specific fields
        if (req.body.progress !== undefined) {
          updateData.progress = parseInt(req.body.progress);
        }
        
        if (req.body.completed !== undefined) {
          updateData.completed = !!req.body.completed;
        }
      } else {
        // For full updates, validate with the schema
        updateData = insertGoalSchema.partial().parse(req.body);
      }
      
      console.log("Processed update data:", updateData);
      
      // Update the goal
      const updatedGoal = await storage.updateGoal(goalId, updateData);
      
      // Broadcast goal update through WebSocket
      broadcastToUser(req.user!.id, 'goal_updated', updatedGoal);
      
      res.json(updatedGoal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid goal data", errors: error.errors });
      } else {
        console.error("Error updating goal:", error);
        res.status(500).json({ message: "Failed to update goal" });
      }
    }
  });

  app.delete("/api/goals/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const goalId = parseInt(req.params.id);
      const goal = await storage.getGoal(goalId);
      
      // Ensure goal exists and belongs to the user
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      if (goal.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete the goal
      const deleted = await storage.deleteGoal(goalId);
      
      if (deleted) {
        // Broadcast goal deletion through WebSocket
        broadcastToUser(req.user!.id, 'goal_deleted', { id: goalId });
        
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Goal not found" });
      }
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // Nutrition goals API endpoints
  app.get("/api/nutrition/goals", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const goals = await storage.getNutritionGoal(userId);
      
      if (!goals) {
        return res.status(404).json({ message: "No nutrition goals found" });
      }
      
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch nutrition goals" });
    }
  });

  app.post("/api/nutrition/goals", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const goalData = insertNutritionGoalSchema.parse(req.body);
      const goals = await storage.setNutritionGoal(userId, goalData);
      
      // Broadcast nutrition goal update through WebSocket
      broadcastToUser(userId, 'nutrition_goals_updated', goals);
      
      res.status(201).json(goals);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid goal data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to set nutrition goals" });
      }
    }
  });

  // OpenAI nutrition lookup
  app.get("/api/nutrition/lookup", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const foodItem = req.query.foodItem as string;
      
      if (!foodItem) {
        return res.status(400).json({ message: "Food item is required" });
      }
      
      const servingSize = req.query.servingSize ? parseFloat(req.query.servingSize as string) : undefined;
      const servingUnit = req.query.servingUnit as string | undefined;
      
      const nutritionInfo = await getNutritionInfo(foodItem, servingSize, servingUnit);
      res.json(nutritionInfo);
    } catch (error) {
      res.status(500).json({ message: "Failed to lookup nutrition information" });
    }
  });
  
  // Configure multer for image upload handling
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // Limit to 10MB
    },
  });
  
  // Food image recognition endpoint
  app.post("/api/nutrition/recognize-food", ensureAuthenticated, upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          message: "No image provided. Please upload a food image." 
        });
      }
      
      console.log("Processing food image recognition request");
      console.log(`Image size: ${(req.file.size / 1024).toFixed(2)} KB, MIME type: ${req.file.mimetype}`);
      
      // Check if required API keys are configured
      if (!process.env.GOOGLE_CLOUD_VISION_API_KEY || !process.env.NUTRITIONIX_APP_ID || !process.env.NUTRITIONIX_API_KEY) {
        return res.status(500).json({
          message: "Food recognition services are not properly configured. Missing required API keys."
        });
      }
      
      // Convert the file buffer to a base64 string
      const base64Image = req.file.buffer.toString('base64');
      
      // Use the analyzeFoodImage service to process the image
      console.log("Starting food image analysis with Vision API and Nutritionix...");
      const recognizedFoods = await analyzeFoodImage(base64Image);
      
      if (recognizedFoods.length === 0) {
        console.log("No food items recognized in the image");
        return res.status(404).json({
          message: "No food items recognized in the image. Please try with a clearer photo of the food."
        });
      }
      
      // Return the first recognized food item (most confident match)
      const topFood = recognizedFoods[0];
      console.log(`Food recognized: ${topFood.name} (confidence: ${(topFood.confidence * 100).toFixed(2)}%)`);
      console.log(`Nutrition data: ${topFood.calories} kcal, ${topFood.protein}g protein, ${topFood.carbs}g carbs, ${topFood.fat}g fat`);
      
      return res.status(200).json({
        name: topFood.name,
        calories: topFood.calories,
        protein: topFood.protein,
        carbs: topFood.carbs,
        fat: topFood.fat,
        servingSize: topFood.servingSize || 1,
        servingUnit: topFood.servingUnit || "serving",
        confidence: topFood.confidence,
        imageUrl: topFood.imageUrl
      });
    } catch (error: any) {
      console.error("Error recognizing food from image:", error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = "Failed to analyze food image";
      let statusCode = 500;
      
      if (error.message?.includes('invalid app id/key') || error.message?.includes('API key not valid')) {
        errorMessage = "Food recognition API authentication failed. Please contact support.";
        statusCode = 401;
      } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
        errorMessage = "Network error while contacting food recognition service. Please try again.";
        statusCode = 503;
      }
      
      return res.status(statusCode).json({
        message: errorMessage,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Dashboard summary endpoint
  app.get("/api/dashboard", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Fetching dashboard for user ID:", req.user!.id);
      const userId = req.user!.id;
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      
      // Get today's meals - reset to midnight for proper date comparison
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);
      
      // Only get meals that the user has explicitly logged (not system-generated)
      // System-generated meals are created when a fitness plan is generated
      // but they don't count as actual consumption until the user confirms them
      const meals = await storage.getMealsByDate(userId, queryDate);
      
      // Calculate nutrition totals - limit to reasonable values
      const nutritionTotals = meals.reduce((acc, meal) => {
        // Add values only if they are reasonable (less than 10,000 calories per meal)
        if (meal.calories > 0 && meal.calories < 10000) {
          acc.calories += meal.calories;
        }
        if (meal.protein > 0 && meal.protein < 1000) {
          acc.protein += meal.protein;
        }
        if (meal.carbs > 0 && meal.carbs < 1000) {
          acc.carbs += meal.carbs;
        }
        if (meal.fat > 0 && meal.fat < 1000) {
          acc.fat += meal.fat;
        }
        return acc;
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

      // Get active fitness plan if available
      const activeFitnessPlan = await storage.getActiveFitnessPlan(userId);
      
      // Get nutrition goals - prioritize user-set goals, then plan-based goals, then defaults
      let nutritionGoals = await storage.getNutritionGoal(userId);
      
      // If no manual goals set but we have an active plan with preferences, calculate from the plan
      if (!nutritionGoals && activeFitnessPlan?.preferences) {
        const preferences = activeFitnessPlan.preferences as {
          goal: string;
          currentWeight: number;
          fitnessLevel: string;
          workoutDaysPerWeek: number;
        };
        const { goal, currentWeight, fitnessLevel, workoutDaysPerWeek } = preferences;
        
        // Calculate targets based on user's plan (simplified version)
        let caloriesTarget = 2000;
        let proteinTarget = 150;
        let carbsTarget = 225;
        let fatTarget = 65;
        
        // Base metabolic rate - simplified calculation
        const bmr = 10 * (currentWeight || 70) + 500;
        
        // Activity multiplier based on fitness level and workout frequency
        let activityMultiplier = 1.2; // Sedentary
        if (fitnessLevel === 'advanced' || workoutDaysPerWeek >= 5) {
          activityMultiplier = 1.7; // Very active
        } else if (fitnessLevel === 'intermediate' || workoutDaysPerWeek >= 3) {
          activityMultiplier = 1.5; // Moderately active
        } else if (fitnessLevel === 'beginner' || workoutDaysPerWeek >= 1) {
          activityMultiplier = 1.3; // Lightly active
        }
        
        // Base calories
        caloriesTarget = Math.round(bmr * activityMultiplier);
        
        // Adjust based on goal
        if (goal === 'weight loss' || goal === 'weight_loss') {
          caloriesTarget = Math.round(caloriesTarget * 0.8); // 20% deficit
        } else if (goal === 'muscle gain' || goal === 'muscle_gain') {
          caloriesTarget = Math.round(caloriesTarget * 1.1); // 10% surplus
        }
        
        // Macros based on goal
        if (goal === 'muscle gain' || goal === 'muscle_gain') {
          proteinTarget = Math.round((currentWeight || 70) * 2.2); // 2.2g per kg
          fatTarget = Math.round(caloriesTarget * 0.25 / 9); // 25% of calories
          carbsTarget = Math.round((caloriesTarget - (proteinTarget * 4) - (fatTarget * 9)) / 4);
        } else if (goal === 'weight loss' || goal === 'weight_loss') {
          proteinTarget = Math.round((currentWeight || 70) * 2); // 2g per kg
          fatTarget = Math.round(caloriesTarget * 0.3 / 9); // 30% of calories
          carbsTarget = Math.round((caloriesTarget - (proteinTarget * 4) - (fatTarget * 9)) / 4);
        } else {
          // Other fitness goals: stamina, strength, muscleBuild
          proteinTarget = Math.round((currentWeight || 70) * 1.8); // 1.8g per kg
          fatTarget = Math.round(caloriesTarget * 0.25 / 9); // 25% of calories
          carbsTarget = Math.round((caloriesTarget - (proteinTarget * 4) - (fatTarget * 9)) / 4);
        }
        
        nutritionGoals = {
          id: 0, // This will be ignored in the dashboard display
          userId: userId,  
          caloriesTarget,
          proteinTarget,
          carbsTarget,
          fatTarget
        };
      }
      
      // Default values if no goals found
      if (!nutritionGoals) {
        nutritionGoals = {
          id: 0, // This will be ignored in the dashboard display
          userId: userId,
          caloriesTarget: 2000,
          proteinTarget: 150,
          carbsTarget: 225,
          fatTarget: 65
        };
      }

      // Get latest weight data
      const latestWeight = await storage.getLatestWeight(userId);
      const weights = await storage.getWeights(userId);
      
      // Calculate weight change (if possible)
      let weightChange = 0;
      if (weights.length >= 2) {
        weightChange = weights[0].weight - weights[1].weight;
      }

      // Get recent workouts (last 10)
      const allWorkouts = await storage.getWorkouts(userId);
      console.log("Fetching workouts for user ID:", userId);
      console.log("Found workouts:", allWorkouts.length);
      
      const recentWorkouts = allWorkouts
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 10);
        
      // Count workouts this week (properly comparing dates)
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start of current week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);
      
      // Filter workouts to count only those from this week that are marked as completed
      const completedWorkoutsThisWeek = allWorkouts.filter(workout => {
        // Convert both dates to timestamps for comparison
        const workoutDate = new Date(workout.date);
        return workoutDate >= startOfWeek && workout.completed === true;
      }).length;
      
      // Apply a reasonable cap to avoid unrealistic values
      const cappedWorkoutsThisWeek = Math.min(completedWorkoutsThisWeek, 14); // Cap at two per day
      
      // Get target from user's active fitness plan if available, else default to 5
      const workoutTarget = activeFitnessPlan?.preferences 
        ? (activeFitnessPlan.preferences as any).workoutDaysPerWeek || 5
        : 5;

      // Get recent activities (combined from meals, workouts, and weights)
      const recentActivities = [
        ...meals.map(meal => ({
          type: 'meal',
          name: meal.name,
          date: meal.date,
          data: {
            mealType: meal.mealType,
            calories: meal.calories,
            protein: meal.protein
          }
        })),
        ...recentWorkouts.map(workout => ({
          type: 'workout',
          name: workout.name,
          date: workout.date,
          data: {
            duration: workout.duration
          }
        })),
        ...weights.slice(0, 5).map(weight => ({
          type: 'weight',
          name: 'Weight Updated',
          date: weight.date,
          data: {
            weight: weight.weight,
            unit: weight.unit,
            change: weightChange
          }
        }))
      ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

      // Check if user is assigned to a trainer (to determine AI coach access)
      const trainerAssignments = await storage.getClientTrainers(userId);
      const isAssignedToTrainer = trainerAssignments && trainerAssignments.length > 0;
      
      // Determine access permissions
      const hasAccess = {
        // If user is admin or trainer, they can access AI coach
        // If user is a regular client, they can access AI coach only if not assigned to a trainer
        aiCoach: req.user!.isAdmin || req.user!.isTrainer || !isAssignedToTrainer
      };
      
      res.json({
        nutrition: {
          current: nutritionTotals,
          goals: nutritionGoals
        },
        weight: {
          current: latestWeight,
          change: weightChange
        },
        workouts: {
          thisWeek: cappedWorkoutsThisWeek, // Use capped value for display
          target: workoutTarget, // Use target from fitness plan
          recent: recentWorkouts
        },
        recentActivities,
        activeFitnessPlan,
        hasAccess // Include access control information
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Fitness Coach Chatbot endpoints
  // Check if a user can generate a new fitness plan
  app.get("/api/fitness-plans/eligibility", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = req.user!;
      
      // Admin and trainers can always create plans
      if (user.isAdmin || user.isTrainer) {
        return res.json({ canCreate: true });
      }
      
      // Check if fitness coach is globally disabled
      const globalDisableSetting = await storage.getSetting("fitness_coach_globally_disabled");
      const fitnessCoachGloballyDisabled = globalDisableSetting?.value === "true";
      
      if (fitnessCoachGloballyDisabled) {
        return res.status(403).json({
          canCreate: false,
          globallyDisabled: true,
          message: "The fitness coach feature is currently disabled by the administrator."
        });
      }
      
      // Check if regular user is assigned to a trainer
      const trainerAssignments = await storage.getClientTrainers(userId);
      if (trainerAssignments && trainerAssignments.length > 0) {
        return res.status(403).json({
          canCreate: false,
          hasTrainer: true,
          message: "You are assigned to a personal trainer. Please consult with your trainer for fitness plans."
        });
      }
      
      // Check if user already has a plan in progress
      const planStatus = await storage.getPlanGenerationStatus(userId);
      if (planStatus && planStatus.isGenerating) {
        return res.status(429).json({
          canCreate: false,
          message: "You already have a plan generation in progress. Please wait for it to complete before starting a new one.",
          status: "in_progress"
        });
      }
      
      // Get the frequency setting
      const freqSetting = await storage.getSetting("plan_generation_frequency_days");
      const frequencyInDays = freqSetting ? parseInt(freqSetting.value) : 30; // Default to 30 days
      
      // Check when the user's last plan was generated
      const userPlans = await storage.getFitnessPlans(userId);
      
      // If no previous plans, they can create one
      if (userPlans.length === 0) {
        return res.json({ canCreate: true });
      }
      
      // Check time since most recent plan
      const mostRecentPlan = userPlans[0]; // Plans are ordered by creation date desc
      const daysSinceLastPlan = Math.floor(
        (new Date().getTime() - new Date(mostRecentPlan.createdAt).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastPlan < frequencyInDays) {
        return res.status(429).json({ 
          canCreate: false,
          message: `You can only generate a new fitness plan every ${frequencyInDays} days`,
          daysRemaining: frequencyInDays - daysSinceLastPlan
        });
      }
      
      // User is eligible to create a new plan
      return res.json({ canCreate: true });
    } catch (error) {
      console.error("Error checking plan eligibility:", error);
      res.status(500).json({ message: "Failed to check plan eligibility" });
    }
  });
  
  // Reset a stuck plan generation status
  app.post("/api/fitness-plans/reset-generation", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Get the current generation status
      const currentStatus = await storage.getPlanGenerationStatus(userId);
      
      if (!currentStatus || !currentStatus.isGenerating) {
        return res.status(200).json({ 
          message: "No plan generation in progress to reset",
          wasReset: false
        });
      }
      
      console.log(`[Plan Generation] Manual reset requested for user ${userId}`, {
        currentStep: currentStatus.currentStep,
        totalSteps: currentStatus.totalSteps,
        stepMessage: currentStatus.stepMessage,
        estimatedTimeRemaining: currentStatus.estimatedTimeRemaining,
        errorMessage: currentStatus.errorMessage,
        startedAt: currentStatus.startedAt,
        updatedAt: currentStatus.updatedAt,
        elapsedTime: Math.floor((Date.now() - new Date(currentStatus.startedAt).getTime()) / 1000) + ' seconds'
      });
      
      // Reset the generation status with an error message
      await storage.setPlanGenerationStatus(userId, false, {
        currentStep: 0,
        stepMessage: "Generation reset by user",
        errorMessage: "Generation took too long and was reset by the user"
      });
      
      return res.status(200).json({
        message: "Plan generation status reset successfully",
        wasReset: true
      });
    } catch (error) {
      console.error("Error resetting plan generation status:", error);
      res.status(500).json({ 
        message: "Failed to reset plan generation status", 
        wasReset: false 
      });
    }
  });
  
  // Get current plan generation progress
  app.get("/api/fitness-plans/generation-progress", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Get the current generation status
      const progress = await storage.getPlanGenerationStatus(userId);
      
      if (!progress) {
        return res.status(200).json({
          isGenerating: false,
          progress: null
        });
      }
      
      return res.status(200).json({
        isGenerating: progress.isGenerating,
        progress: {
          currentStep: progress.currentStep,
          totalSteps: progress.totalSteps,
          stepMessage: progress.stepMessage,
          estimatedTimeRemaining: progress.estimatedTimeRemaining,
          startedAt: progress.startedAt,
          updatedAt: progress.updatedAt,
          elapsedTimeSeconds: Math.floor((Date.now() - new Date(progress.startedAt).getTime()) / 1000)
        }
      });
    } catch (error) {
      console.error("Error getting plan generation progress:", error);
      res.status(500).json({ 
        message: "Failed to get plan generation progress",
        isGenerating: false,
        progress: null
      });
    }
  });
  



  app.get("/api/fitness-plans", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const plans = await storage.getFitnessPlans(userId);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch fitness plans" });
    }
  });
  
  app.get("/api/fitness-plans/active", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      console.log(`Fetching active fitness plan for user ID: ${userId}`);
      
      try {
        const plan = await storage.getActiveFitnessPlan(userId);
        
        if (!plan) {
          console.log(`No active fitness plan found for user ID: ${userId}`);
          return res.status(404).json({ message: "No active fitness plan found" });
        }
        
        console.log(`Found active fitness plan: ${plan.id}`);
        
        // Return the full plan data
        return res.json(plan);
      } catch (dbError: any) {
        console.error(`Database error fetching fitness plan:`, dbError);
        return res.status(500).json({ 
          message: "Database error fetching fitness plan", 
          error: dbError?.message || "Unknown database error" 
        });
      }
    } catch (error: any) {
      console.error(`Unexpected error fetching fitness plan:`, error);
      res.status(500).json({ 
        message: "Failed to fetch active fitness plan",
        error: error?.message || "Unknown error"
      });
    }
  });
  
  // Get a specific fitness plan by ID with user ownership check
  app.get("/api/fitness-plans/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const plan = await storage.getFitnessPlan(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Fitness plan not found" });
      }
      
      // Allow access for:
      // 1. User who owns the plan
      // 2. Admin users
      // 3. Trainers who have the plan owner as a client
      let hasAccess = false;
      
      if (plan.userId === userId || req.user!.isAdmin) {
        console.log(`Access granted to user ${userId} for their own plan ${planId} or as admin`);
        hasAccess = true;
      } else if (req.user!.isTrainer) {
        // Check if the trainer has the plan owner as a client
        console.log(`Trainer ${userId} checking access to plan ${planId} owned by user ${plan.userId}`);
        
        try {
          const trainerClients = await storage.getTrainerClients(userId);
          console.log(`Trainer has ${trainerClients.length} clients`);
          
          // Debug client list
          trainerClients.forEach(c => {
            console.log(`Client: ${c.client.id} - ${c.client.username}`);
          });
          
          const isClientOfTrainer = trainerClients.some(c => c.client.id === plan.userId);
          console.log(`Is client of trainer: ${isClientOfTrainer}`);
          
          if (isClientOfTrainer) {
            hasAccess = true;
            console.log(`Access granted to trainer ${userId} for plan ${planId}`);
          }
        } catch (err) {
          console.error('Error checking trainer-client relationship:', err);
          // Don't grant access if there was an error checking the relationship
          hasAccess = false;
        }
      }
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied: This fitness plan belongs to another user" });
      }
      
      res.json(plan);
    } catch (error) {
      console.error("Error fetching fitness plan:", error);
      res.status(500).json({ message: "Failed to fetch fitness plan" });
    }
  });

  // Delete a fitness plan by ID (DELETE endpoint)
  app.delete("/api/fitness-plans/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      console.log(`Attempting to delete fitness plan ${planId} by user ${userId}`);
      
      const plan = await storage.getFitnessPlan(planId);
      
      if (!plan) {
        console.log(`Plan ${planId} not found for deletion`);
        return res.status(404).json({ message: "Fitness plan not found" });
      }
      
      // Allow deletion for:
      // 1. User who owns the plan
      // 2. Admin users
      // 3. Trainers who have the plan owner as a client
      let hasDeletePermission = false;
      
      if (plan.userId === userId || req.user!.isAdmin) {
        console.log(`Delete access granted to user ${userId} for their own plan ${planId} or as admin`);
        hasDeletePermission = true;
      } else if (req.user!.isTrainer) {
        // Check if the trainer has the plan owner as a client
        console.log(`Trainer ${userId} checking delete access to plan ${planId} owned by user ${plan.userId}`);
        
        try {
          const trainerClients = await storage.getTrainerClients(userId);
          console.log(`Trainer has ${trainerClients.length} clients`);
          
          const isClientOfTrainer = trainerClients.some(tc => tc.client.id === plan.userId);
          console.log(`Is client of trainer: ${isClientOfTrainer}`);
          
          if (isClientOfTrainer) {
            hasDeletePermission = true;
            console.log(`Delete access granted to trainer ${userId} for plan ${planId}`);
          }
        } catch (err) {
          console.error('Error checking trainer-client relationship:', err);
          // Don't grant permission if there was an error checking the relationship
          hasDeletePermission = false;
        }
      }
      
      if (!hasDeletePermission) {
        console.log(`User ${userId} doesn't have permission to delete plan ${planId}`);
        return res.status(403).json({ message: "You don't have permission to delete this fitness plan" });
      }
      
      // Delete the fitness plan
      const success = await storage.deleteFitnessPlan(planId);
      
      if (!success) {
        console.log(`Failed to delete plan ${planId}`);
        return res.status(500).json({ message: "Failed to delete fitness plan" });
      }
      
      console.log(`Successfully deleted fitness plan ${planId}`);
      return res.status(204).end();
    } catch (error: any) {
      console.error(`Unexpected error deleting fitness plan:`, error);
      res.status(500).json({ 
        message: "Failed to delete fitness plan",
        error: error?.message || "Unknown error"
      });
    }
  });

  // Update a fitness plan by ID (PUT endpoint)
  app.put("/api/fitness-plans/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const plan = await storage.getFitnessPlan(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Fitness plan not found" });
      }
      
      // Allow updates for:
      // 1. Admin users
      // 2. Trainers who have the plan owner as a client
      let hasUpdatePermission = false;
      
      if (req.user!.isAdmin) {
        console.log(`Update access granted to admin ${userId} for plan ${planId}`);
        hasUpdatePermission = true;
      } else if (req.user!.isTrainer) {
        // Check if the trainer has the plan owner as a client
        console.log(`Trainer ${userId} checking update access to plan ${planId} owned by user ${plan.userId}`);
        
        try {
          const trainerClients = await storage.getTrainerClients(userId);
          hasUpdatePermission = trainerClients.some(c => c.client.id === plan.userId);
          console.log(`Trainer update access to plan: ${hasUpdatePermission}`);
        } catch (err) {
          console.error(`Error checking trainer clients for ${userId}:`, err);
        }
      }
      
      if (!hasUpdatePermission) {
        return res.status(403).json({ message: "You don't have permission to update this fitness plan" });
      }
      
      // Extract and validate update data
      const { preferences, workoutPlan, mealPlan } = req.body;
      
      // Prepare update object
      const updateData: Partial<InsertFitnessPlan> = {};
      
      // Add preferences as JSONB
      if (preferences) {
        updateData.preferences = preferences;
      }
      
      // Add workoutPlan as JSONB
      if (workoutPlan) {
        updateData.workoutPlan = workoutPlan;
      }
      
      // Add mealPlan as JSONB 
      if (mealPlan) {
        updateData.mealPlan = mealPlan;
      }
      
      // Update the plan
      const updatedPlan = await storage.updateFitnessPlan(planId, updateData);
      
      if (!updatedPlan) {
        return res.status(500).json({ message: "Failed to update fitness plan" });
      }
      
      return res.json(updatedPlan);
    } catch (error: any) {
      console.error(`Unexpected error updating fitness plan:`, error);
      res.status(500).json({ 
        message: "Failed to update fitness plan",
        error: error?.message || "Unknown error"
      });
    }
  });

  // Create a new fitness plan using the chatbot
  app.post("/api/fitness-plans/generate", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = req.user!;
      
      // Admin and trainers can always create plans
      if (!user.isAdmin && !user.isTrainer) {
        // Check if fitness coach is globally disabled
        const globalDisableSetting = await storage.getSetting("fitness_coach_globally_disabled");
        const fitnessCoachGloballyDisabled = globalDisableSetting?.value === "true";
        
        if (fitnessCoachGloballyDisabled) {
          return res.status(403).json({
            canCreate: false,
            globallyDisabled: true,
            message: "The fitness coach feature is currently disabled by the administrator."
          });
        }
        
        // Check if regular user is assigned to a trainer
        const trainerAssignments = await storage.getClientTrainers(userId);
        if (trainerAssignments && trainerAssignments.length > 0) {
          return res.status(403).json({
            canCreate: false,
            hasTrainer: true,
            message: "You are assigned to a personal trainer. Please consult with your trainer for fitness plans."
          });
        }
      }
      
      // Check if user already has a plan in progress
      const planStatus = await storage.getPlanGenerationStatus(userId);
      if (planStatus && planStatus.isGenerating && !user.isAdmin) {
        return res.status(429).json({
          canCreate: false,
          message: "You already have a plan generation in progress. Please wait for it to complete before starting a new one.",
          status: "in_progress"
        });
      }
      
      // Get the frequency setting
      const freqSetting = await storage.getSetting("plan_generation_frequency_days");
      const frequencyInDays = freqSetting ? parseInt(freqSetting.value) : 30; // Default to 30 days
      
      // If frequency is > 0, check when the user's last plan was generated
      if (frequencyInDays > 0 && !user.isAdmin) { // Admins can bypass frequency limit
        const userPlans = await storage.getFitnessPlans(userId);
        
        if (userPlans.length > 0) {
          const mostRecentPlan = userPlans[0]; // Plans are ordered by creation date desc
          const daysSinceLastPlan = Math.floor(
            (new Date().getTime() - new Date(mostRecentPlan.createdAt).getTime()) / 
            (1000 * 60 * 60 * 24)
          );
          
          if (daysSinceLastPlan < frequencyInDays) {
            return res.status(429).json({ 
              canCreate: false,
              message: `You can only generate a new fitness plan every ${frequencyInDays} days`,
              daysRemaining: frequencyInDays - daysSinceLastPlan
            });
          }
        }
      }
      
      // Map form values to correct format for OpenAI API
      // These are used in the generateFitnessPlan function
      if (req.body.goal === 'muscle_gain') {
        req.body.goal = 'muscle gain';
      } else if (req.body.goal === 'weight_loss') {
        req.body.goal = 'weight loss';  
      } else if (req.body.goal === 'improve_fitness') {
        req.body.goal = 'improve fitness';
      }
      
      // Validate fitness preferences data
      const preferencesSchema = z.object({
        goal: z.string(),
        currentWeight: z.number(),
        targetWeight: z.number().optional(),
        unit: z.string(),
        workoutDaysPerWeek: z.number().min(1).max(7),
        dietaryRestrictions: z.array(z.string()),
        preferredFoods: z.array(z.string()),
        fitnessLevel: z.string(),
        // Handle both numeric budget and string budget type
        budget: z.union([z.number(), z.string()]).optional(),
        budgetType: z.string().optional(),
        useAdaptiveAI: z.boolean().optional() // New option to use adaptive AI
      });
      
      console.log("Received fitness preferences:", req.body);
      const preferences = preferencesSchema.parse(req.body);
      
      // Get nutrition goals if they exist
      const nutritionGoal = await storage.getNutritionGoal(userId);
      
      // Set the plan generation status to in-progress with detailed tracking
      await storage.setPlanGenerationStatus(userId, true, {
        currentStep: 1,
        totalSteps: 5,
        stepMessage: "Initializing your personalized fitness plan...",
        estimatedTimeRemaining: 60,
        errorMessage: null,
        retryCount: 0
      });
      
      // Detailed logging
      console.log(`[Plan Generation] Starting for user ${userId}`, {
        userAdmin: user.isAdmin,
        fitnessGoal: preferences.goal,
        workoutDaysPerWeek: preferences.workoutDaysPerWeek,
        fitnessLevel: preferences.fitnessLevel,
        timestamp: new Date().toISOString()
      });
      
      // Generate fitness plan - use adaptive version if requested
      let fitnessPlan;
      try {
        // Update progress before AI call
        await storage.setPlanGenerationStatus(userId, true, {
          currentStep: 2,
          stepMessage: "Analyzing your fitness goals and preferences...",
          estimatedTimeRemaining: 50
        });
        
        if (preferences.useAdaptiveAI) {
          console.log(`[Plan Generation] Using adaptive AI coach for user ${userId}`);
          
          // Update progress for adaptive AI
          await storage.setPlanGenerationStatus(userId, true, {
            currentStep: 3,
            stepMessage: "Creating personalized workout and nutrition plan...",
            estimatedTimeRemaining: 40
          });
          
          const { generateAdaptiveFitnessPlan } = require('./adaptive-coach');
          fitnessPlan = await generateAdaptiveFitnessPlan(user, preferences, nutritionGoal);
        } else {
          console.log(`[Plan Generation] Using standard fitness plan generation for user ${userId}`);
          
          // Update progress for standard AI
          await storage.setPlanGenerationStatus(userId, true, {
            currentStep: 3,
            stepMessage: "Creating your fitness plan with AI...",
            estimatedTimeRemaining: 40
          });
          
          fitnessPlan = await generateFitnessPlan(user, preferences, nutritionGoal);
        }
        
        // Update progress after successful AI response
        await storage.setPlanGenerationStatus(userId, true, {
          currentStep: 4,
          stepMessage: "Finalizing your plan...",
          estimatedTimeRemaining: 10
        });
        
        console.log(`[Plan Generation] Successfully generated plan for user ${userId}`);
      } catch (error) {
        console.error(`[Plan Generation] Error generating plan for user ${userId}:`, error);
        
        // Update status to error
        await storage.setPlanGenerationStatus(userId, false, {
          currentStep: 0,
          stepMessage: "Error generating plan",
          errorMessage: error instanceof Error ? error.message : "Unknown error during plan generation"
        });
        
        // Rethrow to be handled by the outer catch block
        throw error;
      }
      
      // Validate that the fitness plan is complete before activating it
      const isWorkoutPlanComplete = fitnessPlan.workoutPlan && 
                                   fitnessPlan.workoutPlan.weeklySchedule && 
                                   Object.keys(fitnessPlan.workoutPlan.weeklySchedule).length > 0;
                                   
      const isMealPlanComplete = fitnessPlan.mealPlan && 
                                fitnessPlan.mealPlan.weeklyMeals && 
                                Object.keys(fitnessPlan.mealPlan.weeklyMeals).length > 0;
      
      if (!isWorkoutPlanComplete || !isMealPlanComplete) {
        console.error("Incomplete fitness plan generated:", {
          hasWorkoutPlan: !!fitnessPlan.workoutPlan,
          workoutDaysCount: fitnessPlan.workoutPlan?.weeklySchedule ? Object.keys(fitnessPlan.workoutPlan.weeklySchedule).length : 0,
          hasMealPlan: !!fitnessPlan.mealPlan,
          mealDaysCount: fitnessPlan.mealPlan?.weeklyMeals ? Object.keys(fitnessPlan.mealPlan.weeklyMeals).length : 0
        });
        
        return res.status(500).json({ 
          message: "Failed to generate a complete fitness plan. Please try again." 
        });
      }
      
      // Reset any existing plan generation status
      await storage.setPlanGenerationStatus(userId, false, {
        currentStep: 0,
        stepMessage: "Reset for new plan generation",
        errorMessage: null
      });

      // Check for existing active plans and deactivate them, removing all data
      const existingActivePlan = await storage.getActiveFitnessPlan(userId);
      if (existingActivePlan) {
        console.log(`Deactivating existing plan ${existingActivePlan.id} and cleaning up all data for user ${userId}`);
        
        // Delete all related data
        try {
          // Delete meals created from the plan
          await db.delete(meals)
            .where(and(
              eq(meals.userId, userId),
              eq(meals.isPlanned, true)
            ));
            
          // Delete workouts created from the plan 
          // First get all workouts for this user
          const userWorkouts = await storage.getWorkouts(userId);
          
          // Then delete each workout (which will also delete their logs via the storage method)
          for (const workout of userWorkouts) {
            await storage.deleteWorkout(workout.id);
          }
          
          console.log(`Deleted ${userWorkouts.length} workouts and their logs for user ${userId}`);
          
          console.log(`Successfully cleaned up all related data for user ${userId} before deactivating plan`);
        } catch (cleanupError) {
          console.error(`Error cleaning up data before plan deactivation for user ${userId}:`, cleanupError);
          // Continue with deactivation anyway
        }
        
        // Now deactivate the plan
        await storage.deactivateFitnessPlan(existingActivePlan.id);
      }
      
      // Save the fitness plan to the database
      const savedPlan = await storage.createFitnessPlan(userId, {
        preferences: fitnessPlan.preferences,
        workoutPlan: fitnessPlan.workoutPlan,
        mealPlan: fitnessPlan.mealPlan,
        isActive: true,
        createdAt: new Date()
      });
      
      // Convert workout plan to workouts in the database
      const workouts = await convertWorkoutPlanToDatabaseFormat(userId, fitnessPlan);
      const savedWorkouts = [];
      
      // Get current date for setting workout dates
      const today = new Date();
      
      // Map day names to their numerical offset from today
      const dayOffsets: {[key: string]: number} = {
        "monday": 0,
        "tuesday": 1,
        "wednesday": 2,
        "thursday": 3,
        "friday": 4,
        "saturday": 5,
        "sunday": 6
      };
      
      for (const workout of workouts) {
        // Auto-populate workout logs by setting their dates to the current week
        // and marking them as planned (not completed)
        
        // Find the day for this workout
        const day = Object.keys(fitnessPlan.workoutPlan.weeklySchedule).find(
          d => workout.name === fitnessPlan.workoutPlan.weeklySchedule[d].name
        );
        
        // Set the date based on the day of the week
        if (day && dayOffsets[day] !== undefined) {
          const workoutDate = new Date(today);
          workoutDate.setDate(today.getDate() + dayOffsets[day]);
          workout.date = workoutDate;
        }
        
        // Create the workout entry
        const savedWorkout = await storage.createWorkout(userId, {
          ...workout,
          completed: false // Mark as planned workout
        });
        
        // Extract exercises from workout plan for this day
        if (day) {
          const daySchedule = fitnessPlan.workoutPlan.weeklySchedule[day];
          // Check if exercises array exists and is valid
          if (!daySchedule || !daySchedule.exercises || !Array.isArray(daySchedule.exercises)) {
            console.log(`No valid exercises found for ${day}, skipping`);
            continue;
          }
          
          const exercises = daySchedule.exercises;
          console.log(`Processing ${exercises.length} exercises for ${day}`);
          
          // Add exercises to the workout
          for (const exercise of exercises) {
            // Handle weight conversion safely
            let weightValue = null;
            if (exercise.weight !== undefined && exercise.weight !== null) {
              // If weight is a number, use it directly
              if (typeof exercise.weight === 'number') {
                weightValue = exercise.weight;
              }
              // If it's a string that can be converted to a number, convert it
              else if (typeof exercise.weight === 'string' && !isNaN(parseFloat(exercise.weight))) {
                weightValue = parseFloat(exercise.weight);
              }
            }
            
            // Handle rest info for notes
            let restNotes = "";
            
            // Extract rest from exercise properties (using any to handle unknown format)
            const rest = (exercise as any).rest;
            
            if (rest !== undefined && rest !== null) {
              // Format rest info for notes only
              if (typeof rest === 'number') {
                restNotes = `Rest: ${rest} seconds`;
              } else if (typeof rest === 'string') {
                restNotes = `Rest: ${rest}`;
              }
            }
            
            // Process rest time value from exercise
            let restValue: string | undefined = undefined;
            const exerciseRest = exercise.rest as any; // Type assertion to handle different formats
            
            if (exerciseRest !== undefined) {
              // If it's already a string, use it directly
              if (typeof exerciseRest === 'string') {
                restValue = exerciseRest;
              } 
              // If it's a number, convert to string with "sec" suffix
              else if (typeof exerciseRest === 'number') {
                restValue = `${exerciseRest} sec`;
              }
              // For exercises like planks that may have special rest instructions
              else if (exercise.name.toLowerCase().includes("plank") || 
                      exercise.name.toLowerCase().includes("hold")) {
                restValue = "60 sec";
              }
            }

            // For planks and similar exercises, OpenAI might provide duration instead of reps
            // Ensure we have a valid value for reps which is a required field
            let repsValue = exercise.reps;
            
            // If reps is null or undefined, check if it's a plank or similar exercise
            // that might have duration instead of reps, or set default to 1
            if (repsValue === null || repsValue === undefined) {
              // Check if the exercise name contains "plank"
              if (exercise.name.toLowerCase().includes("plank")) {
                // For planks, default to 30 seconds
                repsValue = 30;
              } else {
                // Default fallback
                repsValue = 1;
              }
            }
            
            // Create exercise with rest time and ensure reps has a valid value
            await storage.createExercise({
              workoutId: savedWorkout.id,
              name: exercise.name,
              sets: exercise.sets,
              reps: repsValue,
              weight: weightValue,
              unit: "kg",
              rest: restValue // Now we can store rest time as a string
            });
          }
        }
        
        savedWorkouts.push(savedWorkout);
      }
      
      // Auto-populate meal logs based on the meal plan
      const mealPlanTemplates = await convertMealPlanToDatabaseFormat(userId, fitnessPlan);
      const savedMeals: any[] = [];
      
      // Automatically create meal logs for the next week
      if (fitnessPlan.mealPlan.weeklyMeals) {
        const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        const today = new Date();
        
        for (let i = 0; i < dayNames.length; i++) {
          const day = dayNames[i];
          const mealDate = new Date(today);
          mealDate.setDate(today.getDate() + i); // Today + offset for the day of the week
          
          if (!fitnessPlan.mealPlan.weeklyMeals[day]) {
            console.log(`No meals found for ${day}, skipping`);
            continue;
          }
          
          const dayMeals = fitnessPlan.mealPlan.weeklyMeals[day];
          
          // Standard meals (breakfast, lunch, dinner)
          const standardMeals = ["breakfast", "lunch", "dinner"];
          for (const mealType of standardMeals) {
            if (dayMeals[mealType]) {
              const meal = dayMeals[mealType];
              try {
                const savedMeal = await storage.createMeal({
                  userId,
                  name: meal.name,
                  mealType,
                  servingSize: 1,
                  servingUnit: "serving",
                  calories: meal.calories,
                  protein: meal.protein,
                  carbs: meal.carbs,
                  fat: meal.fat,
                  date: mealDate,
                  isPlanned: true // Mark as planned meal vs actually consumed
                });
                savedMeals.push(savedMeal);
              } catch (error) {
                console.error(`Error creating ${mealType} meal for ${day}:`, error);
              }
            }
          }
          
          // Additional meal types
          const additionalMealTypes = ["morning_snack", "evening_snack", "pre_workout", "post_workout"];
          for (const mealType of additionalMealTypes) {
            if (dayMeals[mealType]) {
              const meal = dayMeals[mealType];
              try {
                const savedMeal = await storage.createMeal({
                  userId,
                  name: meal.name,
                  mealType,
                  servingSize: 1,
                  servingUnit: "serving",
                  calories: meal.calories,
                  protein: meal.protein,
                  carbs: meal.carbs,
                  fat: meal.fat,
                  date: mealDate,
                  isPlanned: true // Mark as planned meal vs actually consumed
                });
                savedMeals.push(savedMeal);
              } catch (error) {
                console.error(`Error creating ${mealType} meal for ${day}:`, error);
              }
            }
          }
          
          // Handle snacks array
          if (dayMeals.snacks && Array.isArray(dayMeals.snacks)) {
            for (let j = 0; j < dayMeals.snacks.length; j++) {
              const snack = dayMeals.snacks[j];
              try {
                const savedMeal = await storage.createMeal({
                  userId,
                  name: snack.name,
                  mealType: `snack_${j + 1}`,
                  servingSize: 1,
                  servingUnit: "serving",
                  calories: snack.calories,
                  protein: snack.protein,
                  carbs: snack.carbs,
                  fat: snack.fat,
                  date: mealDate,
                  isPlanned: true // Mark as planned meal vs actually consumed
                });
                savedMeals.push(savedMeal);
              } catch (error) {
                console.error(`Error creating snack ${j + 1} for ${day}:`, error);
              }
            }
          }
        }
      }
      
      // Update nutrition goals if they don't exist
      if (!nutritionGoal) {
        // Calculate nutrition totals from weekly meals (use Monday as reference)
        let totalCalories = 0;
        let totalProtein = 0; 
        let totalCarbs = 0;
        let totalFat = 0;
        
        if (fitnessPlan.mealPlan.weeklyMeals && fitnessPlan.mealPlan.weeklyMeals.monday) {
          const mondayMeals = fitnessPlan.mealPlan.weeklyMeals.monday;
          totalCalories = 
            mondayMeals.breakfast.calories + 
            mondayMeals.lunch.calories + 
            mondayMeals.dinner.calories + 
            mondayMeals.snacks.reduce((sum: number, snack: any) => sum + snack.calories, 0);
            
          totalProtein = 
            mondayMeals.breakfast.protein + 
            mondayMeals.lunch.protein + 
            mondayMeals.dinner.protein + 
            mondayMeals.snacks.reduce((sum: number, snack: any) => sum + snack.protein, 0);
            
          totalCarbs = 
            mondayMeals.breakfast.carbs + 
            mondayMeals.lunch.carbs + 
            mondayMeals.dinner.carbs + 
            mondayMeals.snacks.reduce((sum: number, snack: any) => sum + snack.carbs, 0);
            
          totalFat = 
            mondayMeals.breakfast.fat + 
            mondayMeals.lunch.fat + 
            mondayMeals.dinner.fat + 
            mondayMeals.snacks.reduce((sum: number, snack: any) => sum + snack.fat, 0);
        } else if (fitnessPlan.mealPlan.dailyMeals) {
          // Fallback to legacy dailyMeals structure for backward compatibility
          const { dailyMeals } = fitnessPlan.mealPlan;
          totalCalories = 
            dailyMeals.breakfast.calories + 
            dailyMeals.lunch.calories + 
            dailyMeals.dinner.calories + 
            dailyMeals.snacks.reduce((sum: number, snack: any) => sum + snack.calories, 0);
            
          totalProtein = 
            dailyMeals.breakfast.protein + 
            dailyMeals.lunch.protein + 
            dailyMeals.dinner.protein + 
            dailyMeals.snacks.reduce((sum: number, snack: any) => sum + snack.protein, 0);
            
          totalCarbs = 
            dailyMeals.breakfast.carbs + 
            dailyMeals.lunch.carbs + 
            dailyMeals.dinner.carbs + 
            dailyMeals.snacks.reduce((sum: number, snack: any) => sum + snack.carbs, 0);
            
          totalFat = 
            dailyMeals.breakfast.fat + 
            dailyMeals.lunch.fat + 
            dailyMeals.dinner.fat + 
            dailyMeals.snacks.reduce((sum: number, snack: any) => sum + snack.fat, 0);
        }
          
        await storage.setNutritionGoal(userId, {
          caloriesTarget: Math.round(totalCalories),
          proteinTarget: Math.round(totalProtein),
          carbsTarget: Math.round(totalCarbs),
          fatTarget: Math.round(totalFat)
        });
      }
      
      res.status(201).json({
        plan: savedPlan,
        workouts: savedWorkouts,
        meals: savedMeals
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid fitness preferences", errors: error.errors });
      } else {
        console.error("Fitness plan generation error:", error);
        res.status(500).json({ message: "Failed to generate fitness plan" });
      }
    }
  });

  // Deactivate a fitness plan
  app.post("/api/fitness-plans/:id/deactivate", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { 
        description, 
        bypassFrequencyCheck = false, 
        adminCode = "", 
        removeMealLogs = false, 
        removeWorkoutLogs = false,
        removeDataFromLogs = true, // Default to true - always remove data when deactivating
        reason = "User requested deactivation"
      } = req.body; // Get the user-provided data including options to remove logs
      
      console.log(`Deactivating plan ${id} with removeDataFromLogs=${removeDataFromLogs}`);
      
      // If the new removeDataFromLogs flag is set, apply it to both meal and workout logs
      const shouldRemoveMealLogs = removeDataFromLogs || removeMealLogs;
      const shouldRemoveWorkoutLogs = removeDataFromLogs || removeWorkoutLogs;
      
      console.log(`Final cleanup settings: removeMealLogs=${shouldRemoveMealLogs}, removeWorkoutLogs=${shouldRemoveWorkoutLogs}`);
      
      console.log(`Deactivating fitness plan ${id} for user ${userId} with description: ${description || 'none provided'}`);
      console.log(`Remove meal logs: ${shouldRemoveMealLogs}, Remove workout logs: ${shouldRemoveWorkoutLogs}`);
      
      // Check if the plan exists and belongs to the user
      const plan = await storage.getFitnessPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Fitness plan not found" });
      }
      
      // Check if the plan belongs to the user
      if (plan.userId !== userId && !user.isAdmin) {
        return res.status(403).json({ message: "Access denied: This fitness plan belongs to another user" });
      }
      
      // Check if plan generation is globally disabled - if so, only admins can deactivate plans
      const globalDisableSetting = await storage.getSetting("fitness_coach_globally_disabled");
      const isGloballyDisabled = globalDisableSetting && globalDisableSetting.value === "true";
      
      if (isGloballyDisabled && !user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Plan generation is currently disabled by administrators. Please try again later."
        });
      }
      
      // Validate admin bypass code if it's provided and user is not an admin
      let bypassAllowed = bypassFrequencyCheck;
      if (bypassFrequencyCheck && !user.isAdmin) {
        // The actual admin code should be stored securely (e.g., as an environment variable or in the database)
        // For demo purposes, we'll use a simple hardcoded validation - in production this should be more secure
        const validAdminCode = "FITNESS-OVERRIDE-2024"; // In production, use a stored/environment value
        
        if (adminCode !== validAdminCode) {
          return res.status(401).json({
            success: false,
            message: "Invalid admin override code"
          });
        }
        
        console.log(`User ${userId} used a valid admin override code to bypass frequency checks`);
        bypassAllowed = true;
      }
      
      // Don't check frequency limits for admins or if bypass flag is validated
      if (!user.isAdmin && !bypassAllowed) {
        // Get the frequency setting
        const freqSetting = await storage.getSetting("plan_generation_frequency_days");
        const frequencyInDays = freqSetting ? parseInt(freqSetting.value) : 30; // Default to 30 days
        
        // Check when the user's last plan was generated
        const userPlans = await storage.getFitnessPlans(userId);
        
        if (userPlans.length > 0) {
          const mostRecentPlan = userPlans[0]; // Plans are ordered by creation date desc
          const daysSinceLastPlan = Math.floor(
            (new Date().getTime() - new Date(mostRecentPlan.createdAt).getTime()) / 
            (1000 * 60 * 60 * 24)
          );
          
          // Check if user can generate a new plan
          if (daysSinceLastPlan < frequencyInDays) {
            return res.status(429).json({ 
              success: false,
              canDeactivate: false,
              message: `You cannot deactivate your current plan until ${frequencyInDays} days have passed since creation (${frequencyInDays - daysSinceLastPlan} days remaining).`,
              daysRemaining: frequencyInDays - daysSinceLastPlan
            });
          }
        }
      }
      
      // Store the deactivation reason in the database
      try {
        // First update the plan to include the deactivation reason
        await db.update(fitnessPlans)
          .set({ 
            deactivationReason: reason || description || null,
            deactivatedAt: new Date()
          })
          .where(eq(fitnessPlans.id, id));
        
        console.log(`Added deactivation reason to plan ${id}`);
      } catch (updateError) {
        console.error("Failed to update plan with deactivation reason:", updateError);
        // Continue anyway, this isn't critical
      }
      
      // Deactivate the plan
      const success = await storage.deactivateFitnessPlan(id);
      
      if (!success) {
        return res.status(404).json({ message: "Fitness plan not found" });
      }
      
      // Remove planned meals if requested
      if (shouldRemoveMealLogs) {
        try {
          // Find all meals that were created from the plan (marked with isPlanned=true)
          const result = await db.delete(meals)
            .where(and(
              eq(meals.userId, userId),
              eq(meals.isPlanned, true)
            )).returning();
          
          console.log(`Removed ${result.length} planned meals for user ${userId}`);
        } catch (removeError) {
          console.error("Error removing planned meals:", removeError);
          // Continue anyway, this isn't critical
        }
      }
      
      // Remove planned workouts if requested
      if (shouldRemoveWorkoutLogs) {
        try {
          // Get all workouts that match names from the plan
          const workouts = await storage.getWorkouts(userId);
          
          // Extract workout names from the plan
          const planWorkoutNames: string[] = [];
          const weeklySchedule = plan.workoutPlan.weeklySchedule || {};
          
          Object.keys(weeklySchedule).forEach(day => {
            const dayWorkouts = weeklySchedule[day] || [];
            if (Array.isArray(dayWorkouts)) {
              dayWorkouts.forEach(workout => {
                if (workout && workout.name) {
                  planWorkoutNames.push(workout.name);
                }
              });
            } else if (dayWorkouts && dayWorkouts.name) {
              planWorkoutNames.push(dayWorkouts.name);
            }
          });
          
          // Filter for workouts that match the plan's workout names and are not completed
          const workoutsToDelete = workouts.filter(workout => 
            planWorkoutNames.includes(workout.name) && !workout.completed
          );
          
          // Delete each matching workout
          for (const workout of workoutsToDelete) {
            await storage.deleteWorkout(workout.id);
          }
          
          console.log(`Removed ${workoutsToDelete.length} planned workouts for user ${userId}`);
        } catch (removeError) {
          console.error("Error removing planned workouts:", removeError);
          // Continue anyway, this isn't critical
        }
      }
      
      // If admin or bypass is allowed, reset the cooldown
      if (user.isAdmin || bypassFrequencyCheck) {
        // Reset the user's plan generation cooldown to allow immediate creation of a new plan
        await resetUserPlanCooldown(userId);
        console.log(`Reset plan generation cooldown for user ${userId}`);
      }
      
      // Clear any plan generation status for this user when deactivating a plan
      try {
        await storage.clearPlanGenerationStatus(userId);
        console.log(`Cleared plan generation status for user ${userId} after deactivating plan ${id}`);
      } catch (clearError) {
        console.warn(`Failed to clear plan generation status for user ${userId}:`, clearError);
        // Continue anyway, this isn't critical
      }
      
      res.status(200).json({ 
        success: true,
        message: "Fitness plan deactivated successfully" 
      });
    } catch (error) {
      console.error("Error deactivating fitness plan:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to deactivate fitness plan" 
      });
    }
  });
  
  // Create workouts from a fitness plan
  app.post("/api/fitness-plans/:planId/create-workouts", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const planId = parseInt(req.params.planId);
      
      console.log(`Creating workouts from fitness plan ${planId} for user ${userId}`);
      
      // Get the fitness plan and validate ownership
      const plan = await storage.getFitnessPlan(planId);
      
      if (!plan) {
        return res.status(404).json({ 
          success: false, 
          message: "Fitness plan not found" 
        });
      }
      
      if (plan.userId !== userId && !req.user!.isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied: This fitness plan belongs to another user" 
        });
      }
      
      if (!plan.isActive) {
        return res.status(400).json({
          success: false,
          message: "Cannot create workouts from an inactive fitness plan"
        });
      }
      
      // Validate that the plan has a workout schedule
      if (!plan.workoutPlan || !plan.workoutPlan.weeklySchedule) {
        return res.status(400).json({
          success: false,
          message: "This fitness plan does not have a workout schedule"
        });
      }
      
      const weeklySchedule = plan.workoutPlan.weeklySchedule;
      const createdWorkouts = [];
      
      // Get the day of week mapping for creating workouts
      const dayMap: Record<string, number> = {
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6,
        'sunday': 0
      };
      
      // Get current date and find the upcoming date for each day
      const today = new Date();
      const workoutDates: Record<string, Date> = {};
      
      // Calculate the next date for each day of the week
      Object.keys(weeklySchedule).forEach(day => {
        const dayLower = day.toLowerCase();
        if (dayMap[dayLower] !== undefined) {
          const targetDay = dayMap[dayLower];
          const daysUntilTarget = (targetDay + 7 - today.getDay()) % 7;
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + daysUntilTarget);
          workoutDates[dayLower] = targetDate;
        }
      });
      
      // Create workouts for each day in the schedule
      for (const [day, workoutsForDay] of Object.entries(weeklySchedule)) {
        const dayLower = day.toLowerCase();
        const workoutDate = workoutDates[dayLower];
        
        if (!workoutDate) continue;
        
        // Handle both array and single workout formats
        const workoutsList = Array.isArray(workoutsForDay) ? workoutsForDay : [workoutsForDay];
        
        for (const workoutData of workoutsList) {
          if (!workoutData || !workoutData.name) continue;
          
          try {
            // Create the workout
            const workout = await storage.createWorkout(userId, {
              name: workoutData.name,
              date: workoutDate,
              duration: workoutData.duration || 60,
              notes: `Auto-created from fitness plan: ${plan.preferences?.name || "Untitled Plan"}`,
              completed: false
            });
            
            // If the workout has exercises, create them too
            if (workoutData.exercises && Array.isArray(workoutData.exercises)) {
              for (const exerciseData of workoutData.exercises) {
                if (!exerciseData.name) continue;
                
                await storage.createExercise(workout.id, {
                  name: exerciseData.name,
                  sets: exerciseData.sets || 3,
                  reps: exerciseData.reps || 10,
                  weight: exerciseData.weight || 0,
                  unit: exerciseData.unit || "kg",
                  rest: exerciseData.rest || "60 sec"
                });
              }
            }
            
            createdWorkouts.push(workout);
          } catch (error) {
            console.error(`Error creating workout for ${day}:`, error);
            // Continue with the next workout
          }
        }
      }
      
      console.log(`Created ${createdWorkouts.length} workouts for user ${userId} from plan ${planId}`);
      
      return res.status(200).json({
        success: true,
        message: `Created ${createdWorkouts.length} workouts from your fitness plan`,
        workouts: createdWorkouts
      });
      
    } catch (error) {
      console.error("Error creating workouts from fitness plan:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create workouts from fitness plan"
      });
    }
  });
  
  // Create meals from a fitness plan
  app.post("/api/fitness-plans/:planId/create-meals", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const planId = parseInt(req.params.planId);
      
      console.log(`Creating meals from fitness plan ${planId} for user ${userId}`);
      
      // Get the fitness plan and validate ownership
      const plan = await storage.getFitnessPlan(planId);
      
      if (!plan) {
        return res.status(404).json({ 
          success: false, 
          message: "Fitness plan not found" 
        });
      }
      
      if (plan.userId !== userId && !req.user!.isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied: This fitness plan belongs to another user" 
        });
      }
      
      if (!plan.isActive) {
        return res.status(400).json({
          success: false,
          message: "Cannot create meals from an inactive fitness plan"
        });
      }
      
      // Validate that the plan has a meal plan
      if (!plan.mealPlan || (!plan.mealPlan.weeklyMeals && !plan.mealPlan.weeklyMealPlan)) {
        return res.status(400).json({
          success: false,
          message: "This fitness plan does not have a meal plan"
        });
      }
      
      const weeklyMeals = plan.mealPlan.weeklyMeals || plan.mealPlan.weeklyMealPlan;
      const createdMeals = [];
      
      // Get the day of week mapping for creating meals
      const dayMap: Record<string, number> = {
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6,
        'sunday': 0
      };
      
      // Get current date and find the upcoming date for each day
      const today = new Date();
      const mealDates: Record<string, Date> = {};
      
      // Calculate the next date for each day of the week
      Object.keys(weeklyMeals).forEach(day => {
        const dayLower = day.toLowerCase();
        if (dayMap[dayLower] !== undefined) {
          const targetDay = dayMap[dayLower];
          const daysUntilTarget = (targetDay + 7 - today.getDay()) % 7;
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + daysUntilTarget);
          mealDates[dayLower] = targetDate;
        }
      });
      
      // Create meals for each day in the schedule
      for (const [day, mealsForDay] of Object.entries(weeklyMeals)) {
        const dayLower = day.toLowerCase();
        const mealDate = mealDates[dayLower];
        
        if (!mealDate) continue;
        
        // Handle different data structures - weeklyMealPlan vs weeklyMeals
        const isLegacyStructure = Array.isArray(mealsForDay);
        
        if (isLegacyStructure) {
          // Handle legacy array structure
          for (const mealData of mealsForDay as any[]) {
            if (!mealData || !mealData.name) continue;
            
            try {
              // Create default data for required fields
              const mealType = mealData.type || "meal";
              const servingSize = mealData.servingSize || 1;
              const servingUnit = mealData.servingUnit || "serving";
              const calories = mealData.calories || 0;
              const protein = mealData.protein || 0;
              const carbs = mealData.carbs || 0;
              const fat = mealData.fat || 0;
              
              // Create the meal
              const meal = await db.insert(meals).values({
                userId: userId,
                name: mealData.name,
                mealType: mealType,
                servingSize: servingSize,
                servingUnit: servingUnit,
                calories: calories,
                protein: protein,
                carbs: carbs,
                fat: fat,
                date: mealDate,
                isPlanned: true, // Mark as created from plan
              }).returning();
              
              if (meal && meal.length > 0) {
                createdMeals.push(meal[0]);
              }
            } catch (error) {
              console.error(`Error creating meal for ${day}:`, error);
              // Continue with the next meal
            }
          }
        } else {
          // Handle new object structure (weeklyMealPlan)
          const mealTypes = Object.keys(mealsForDay as Record<string, any>);
          
          for (const mealType of mealTypes) {
            // Skip snacks array for now - we'll handle it separately
            if (mealType === 'snacks') continue;
            
            const mealData = (mealsForDay as Record<string, any>)[mealType];
            if (!mealData || !mealData.name) continue;
            
            try {
              // Create default data for required fields
              const servingSize = mealData.servingSize || 1;
              const servingUnit = mealData.servingUnit || "serving";
              const calories = mealData.calories || 0;
              const protein = mealData.protein || 0;
              const carbs = mealData.carbs || 0;
              const fat = mealData.fat || 0;
              
              // Create the meal
              const meal = await db.insert(meals).values({
                userId: userId,
                name: mealData.name,
                mealType: mealType,
                servingSize: servingSize,
                servingUnit: servingUnit,
                calories: calories,
                protein: protein,
                carbs: carbs,
                fat: fat,
                date: mealDate,
                isPlanned: true, // Mark as created from plan
              }).returning();
            
              if (meal && meal.length > 0) {
                createdMeals.push(meal[0]);
              }
            } catch (error) {
              console.error(`Error creating meal for ${day} - ${mealType}:`, error);
              // Continue with the next meal
            }
          }
          
          // Now handle snacks array if it exists
          if (mealsForDay.snacks && Array.isArray(mealsForDay.snacks)) {
            for (const snackData of mealsForDay.snacks) {
              if (!snackData || !snackData.name) continue;
              
              try {
                // Create default data for required fields
                const servingSize = snackData.servingSize || 1;
                const servingUnit = snackData.servingUnit || "serving";
                const calories = snackData.calories || 0;
                const protein = snackData.protein || 0;
                const carbs = snackData.carbs || 0;
                const fat = snackData.fat || 0;
                
                // Create the meal
                const meal = await db.insert(meals).values({
                  userId: userId,
                  name: snackData.name,
                  mealType: "snack",
                  servingSize: servingSize,
                  servingUnit: servingUnit,
                  calories: calories,
                  protein: protein,
                  carbs: carbs,
                  fat: fat,
                  date: mealDate,
                  isPlanned: true, // Mark as created from plan
                }).returning();
                
                if (meal && meal.length > 0) {
                  createdMeals.push(meal[0]);
                }
              } catch (error) {
                console.error(`Error creating snack for ${day}:`, error);
                // Continue with the next snack
              }
            }
          }
        }
      }
      
      console.log(`Created ${createdMeals.length} meals for user ${userId} from plan ${planId}`);
      
      return res.status(200).json({
        success: true,
        message: `Created ${createdMeals.length} meals from your fitness plan`,
        meals: createdMeals
      });
      
    } catch (error) {
      console.error("Error creating meals from fitness plan:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create meals from fitness plan"
      });
    }
  });
  
  // Admin routes for system settings, fitness plan management, and user management
  
  // Admin routes for user workouts management
  app.get("/api/admin/users/:userId/workouts", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log("Admin fetching workouts for user ID:", userId);
      const workouts = await storage.getWorkouts(userId);
      
      // Enhance workouts with exercise data
      const enhancedWorkouts = await Promise.all(workouts.map(async (workout) => {
        try {
          const exercises = await storage.getExercisesByWorkout(workout.id);
          return { ...workout, exercises };
        } catch (exerciseError) {
          console.error("Error fetching exercises for workout:", workout.id, exerciseError);
          return { ...workout, exercises: [] };
        }
      }));
      
      res.json(enhancedWorkouts);
    } catch (error) {
      console.error("Error fetching user workouts:", error);
      res.status(500).json({ message: "Failed to fetch user workouts" });
    }
  });
  
  // Admin route to edit user workout
  app.put("/api/admin/workouts/:id", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { exercises, ...workoutData } = req.body;
      
      // Process date if present
      const processedWorkoutData = { ...workoutData };
      if (workoutData.date) {
        processedWorkoutData.date = new Date(workoutData.date);
      }
      
      // Update workout
      const validWorkoutData = insertWorkoutSchema.partial().parse(processedWorkoutData);
      const updatedWorkout = await storage.updateWorkout(id, validWorkoutData);
      
      if (!updatedWorkout) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // If exercises are provided, update or add them
      if (Array.isArray(exercises)) {
        for (const exercise of exercises) {
          if (exercise.id) {
            // Update existing exercise
            const { id: exerciseId, ...exerciseData } = exercise;
            await storage.updateExercise(exerciseId, exerciseData);
          } else {
            // Add new exercise
            await storage.createExercise({
              ...exercise,
              workoutId: id
            });
          }
        }
      }
      
      // Get updated exercises
      const updatedExercises = await storage.getExercisesByWorkout(id);
      
      res.json({ ...updatedWorkout, exercises: updatedExercises });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid workout data", errors: error.errors });
      } else {
        console.error("Workout update error:", error);
        res.status(500).json({ message: "Failed to update workout" });
      }
    }
  });
  
  // Admin route to delete user workout
  app.delete("/api/admin/workouts/:id", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteWorkout(id);
      
      if (!success) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete workout" });
    }
  });
  
  // Admin routes for user weight entries
  app.get("/api/admin/users/:userId/weights", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const weights = await storage.getWeights(userId);
      res.json(weights);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user weights" });
    }
  });
  
  // Get all system settings
  app.get("/api/admin/settings", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      res.status(200).json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });
  
  // Get a specific system setting
  app.get("/api/admin/settings/:key", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      const setting = await storage.getSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.status(200).json(setting);
    } catch (error) {
      console.error(`Error fetching setting ${req.params.key}:`, error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });
  
  // Update or create a system setting
  app.post("/api/admin/settings", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const { key, value, description } = req.body;
      
      if (!key || !value) {
        return res.status(400).json({ message: "Key and value are required" });
      }
      
      const setting = await storage.setSetting(key, value, description);
      res.status(200).json(setting);
    } catch (error) {
      console.error("Error updating system setting:", error);
      res.status(500).json({ message: "Failed to update system setting" });
    }
  });
  
  // Library Update API endpoints (admin only)
  
  // Update exercise library via adminLibraryUpdates instead of direct calls
  app.post("/api/admin/library/exercises/update", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const { count = 5, category } = req.body;
      
      // Validate count
      if (count <= 0 || count > 20) {
        return res.status(400).json({ 
          message: "Count must be between 1 and 20" 
        });
      }
      
      // Use the updateExercises function from adminLibraryUpdates
      const result = await updateExercises({ count, category });
      
      res.status(result.success ? 200 : 500).json(result);
    } catch (error: unknown) {
      console.error("Error updating exercise library:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to update exercise library",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Update meal recipe library via adminLibraryUpdates instead of direct calls
  app.post("/api/admin/library/recipes/update", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const { count = 5, mealType } = req.body;
      
      // Validate count
      if (count <= 0 || count > 20) {
        return res.status(400).json({ 
          message: "Count must be between 1 and 20" 
        });
      }
      
      // Use the updateMeals function from adminLibraryUpdates
      const result = await updateMeals({ count, mealType });
      
      res.status(result.success ? 200 : 500).json(result);
    } catch (error: unknown) {
      console.error("Error updating meal recipe library:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to update meal recipe library",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Update both libraries
  app.post("/api/admin/library/update", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const { exerciseCount = 5, recipeCount = 5 } = req.body;
      
      // Validate counts
      if (exerciseCount <= 0 || exerciseCount > 20 || recipeCount <= 0 || recipeCount > 20) {
        return res.status(400).json({ 
          message: "Counts must be between 1 and 20 for both libraries" 
        });
      }
      
      // Use the new admin routes for library updates instead of direct calls
      const options = {
        exercises: { count: exerciseCount },
        meals: { count: recipeCount }
      };
      
      // Use the updateBothLibraries function from adminLibraryUpdates
      const result = await updateBothLibraries(options);
      
      res.status(result.success ? 200 : 500).json({
        message: result.success ? "Complete library update successful" : "Library update partially failed",
        exerciseResult: result.exerciseUpdate,
        mealResult: result.mealUpdate,
        timestamp: new Date().toISOString()
      });
    } catch (error: unknown) {
      console.error("Error updating libraries:", error);
      res.status(500).json({ 
        message: "Failed to update libraries",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get all fitness plans (admin)
  app.get("/api/admin/fitness-plans", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const plans = await storage.getAllFitnessPlans();
      res.status(200).json(plans);
    } catch (error) {
      console.error("Error fetching all fitness plans:", error);
      res.status(500).json({ message: "Failed to fetch fitness plans" });
    }
  });
  
  // Get a specific fitness plan (admin)
  app.get("/api/admin/fitness-plans/:id", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const plan = await storage.getFitnessPlan(id);
      
      if (!plan) {
        return res.status(404).json({ message: "Fitness plan not found" });
      }
      
      res.status(200).json(plan);
    } catch (error) {
      console.error(`Error fetching fitness plan ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch fitness plan" });
    }
  });
  
  // Update a fitness plan (admin)
  app.put("/api/admin/fitness-plans/:id", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const update = req.body;
      
      const updatedPlan = await storage.updateFitnessPlan(id, update);
      
      if (!updatedPlan) {
        return res.status(404).json({ message: "Fitness plan not found" });
      }
      
      res.status(200).json(updatedPlan);
    } catch (error) {
      console.error(`Error updating fitness plan ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update fitness plan" });
    }
  });
  
  // Reset all stuck plan generations (admin)
  app.post("/api/admin/reset-stuck-generations", ensureAdmin, async (req: Request, res: Response) => {
    try {
      // Fetch all plan generation statuses that are stuck
      const [stuckGenerations] = await db.execute(sql`
        SELECT * FROM plan_generation_status 
        WHERE is_generating = true 
        AND updated_at < NOW() - INTERVAL '15 minutes'
      `);
      
      if (!stuckGenerations || stuckGenerations.length === 0) {
        return res.status(200).json({ 
          message: "No stuck plan generations found",
          resetCount: 0
        });
      }
      
      // Reset all stuck generations
      const userIds = stuckGenerations.map((generation: any) => generation.user_id);
      
      console.log(`Resetting ${userIds.length} stuck plan generations for users:`, userIds);
      
      // Update all stuck generations to not generating
      await db.execute(sql`
        UPDATE plan_generation_status 
        SET is_generating = false, updated_at = NOW() 
        WHERE is_generating = true 
        AND updated_at < NOW() - INTERVAL '15 minutes'
      `);
      
      return res.status(200).json({
        message: `Successfully reset ${userIds.length} stuck plan generations`,
        resetCount: userIds.length,
        userIds: userIds
      });
    } catch (error) {
      console.error("Error resetting stuck plan generations:", error);
      res.status(500).json({ 
        message: "Failed to reset stuck plan generations", 
        error: error.message 
      });
    }
  });

  // Exercise Library API Endpoints
  
  // Get all exercises in library
  app.get("/api/exercise-library", async (req: Request, res: Response) => {
    try {
      let exercises;
      
      if (req.query.muscleGroup) {
        exercises = await storage.getExerciseLibraryByMuscleGroup(req.query.muscleGroup as string);
      } else {
        exercises = await storage.getExerciseLibrary();
      }
      
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching exercise library:", error);
      res.status(500).json({ message: "Failed to fetch exercise library" });
    }
  });
  
  // Get a specific exercise
  app.get("/api/exercise-library/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const exercise = await storage.getExerciseLibraryById(id);
      
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }
      
      res.json(exercise);
    } catch (error) {
      console.error(`Error fetching exercise ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch exercise" });
    }
  });
  
  // Create a new exercise (admin only)
  app.post("/api/exercise-library", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const exerciseData = insertExerciseLibrarySchema.parse(req.body);
      const newExercise = await storage.createExerciseLibraryEntry(exerciseData);
      
      res.status(201).json(newExercise);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid exercise data", errors: error.errors });
      } else {
        console.error("Error creating exercise:", error);
        res.status(500).json({ message: "Failed to create exercise" });
      }
    }
  });
  
  // Update an exercise (admin only)
  app.put("/api/exercise-library/:id", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const exerciseData = insertExerciseLibrarySchema.partial().parse(req.body);
      
      const updatedExercise = await storage.updateExerciseLibraryEntry(id, exerciseData);
      
      if (!updatedExercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }
      
      res.json(updatedExercise);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid exercise data", errors: error.errors });
      } else {
        console.error(`Error updating exercise ${req.params.id}:`, error);
        res.status(500).json({ message: "Failed to update exercise" });
      }
    }
  });
  
  // Delete an exercise (admin only)
  app.delete("/api/exercise-library/:id", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteExerciseLibraryEntry(id);
      
      if (!success) {
        return res.status(404).json({ message: "Exercise not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting exercise ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete exercise" });
    }
  });

  // Meal Recipe Library API endpoints
  
  // Get all meal recipes
  app.get("/api/meal-recipes", async (req: Request, res: Response) => {
    try {
      const recipes = await getAllMealRecipes();
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching meal recipes:", error);
      res.status(500).json({ message: "Failed to fetch meal recipes" });
    }
  });

  // Get featured meal recipes
  app.get("/api/meal-recipes/featured", async (req: Request, res: Response) => {
    try {
      const recipes = await getFeaturedMealRecipes();
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching featured meal recipes:", error);
      res.status(500).json({ message: "Failed to fetch featured meal recipes" });
    }
  });

  // Get meal recipes by type
  app.get("/api/meal-recipes/type/:mealType", async (req: Request, res: Response) => {
    try {
      const mealType = req.params.mealType;
      const recipes = await getMealRecipesByType(mealType);
      res.json(recipes);
    } catch (error) {
      console.error(`Error fetching ${req.params.mealType} meal recipes:`, error);
      res.status(500).json({ message: "Failed to fetch meal recipes by type" });
    }
  });

  // Get meal recipes by budget
  app.get("/api/meal-recipes/budget/:budget", async (req: Request, res: Response) => {
    try {
      const budget = req.params.budget;
      const recipes = await getMealRecipesByBudget(budget);
      res.json(recipes);
    } catch (error) {
      console.error(`Error fetching ${req.params.budget} budget meal recipes:`, error);
      res.status(500).json({ message: "Failed to fetch meal recipes by budget" });
    }
  });

  // Get a specific meal recipe
  app.get("/api/meal-recipes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const recipe = await getMealRecipeById(id);
      
      if (!recipe) {
        return res.status(404).json({ message: "Meal recipe not found" });
      }
      
      res.json(recipe);
    } catch (error) {
      console.error(`Error fetching meal recipe ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch meal recipe" });
    }
  });

  // Create a new meal recipe (admin only)
  app.post("/api/meal-recipes", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const recipeData = insertMealRecipeSchema.parse(req.body);
      const newRecipe = await createMealRecipe(recipeData);
      
      res.status(201).json(newRecipe);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid recipe data", errors: error.errors });
      } else {
        console.error("Error creating meal recipe:", error);
        res.status(500).json({ message: "Failed to create meal recipe" });
      }
    }
  });

  // Generate a meal recipe
  app.post("/api/meal-recipes/generate", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { mealType, budget, dietary } = req.body;
      
      if (!mealType || !budget) {
        return res.status(400).json({ message: "Meal type and budget are required" });
      }
      
      const generatedRecipe = await generateRecipe(mealType, budget, dietary);
      
      res.status(201).json(generatedRecipe);
    } catch (error) {
      console.error("Error generating meal recipe:", error);
      res.status(500).json({ message: "Failed to generate meal recipe" });
    }
  });

  // Update a meal recipe (admin only)
  app.put("/api/meal-recipes/:id", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const recipeData = insertMealRecipeSchema.partial().parse(req.body);
      
      const updatedRecipe = await updateMealRecipe(id, recipeData);
      
      if (!updatedRecipe) {
        return res.status(404).json({ message: "Meal recipe not found" });
      }
      
      res.json(updatedRecipe);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid recipe data", errors: error.errors });
      } else {
        console.error(`Error updating meal recipe ${req.params.id}:`, error);
        res.status(500).json({ message: "Failed to update meal recipe" });
      }
    }
  });

  // Toggle recipe featured status (admin only)
  app.patch("/api/meal-recipes/:id/featured", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { featured } = req.body;
      
      if (typeof featured !== 'boolean') {
        return res.status(400).json({ message: "Featured status must be a boolean" });
      }
      
      const updatedRecipe = await toggleFeaturedRecipe(id, featured);
      
      if (!updatedRecipe) {
        return res.status(404).json({ message: "Meal recipe not found" });
      }
      
      res.json(updatedRecipe);
    } catch (error) {
      console.error(`Error toggling featured status for meal recipe ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update featured status" });
    }
  });

  // Refresh featured recipes (admin only)
  app.post("/api/meal-recipes/refresh-featured", ensureAdmin, async (req: Request, res: Response) => {
    try {
      await refreshFeaturedRecipes();
      const featuredRecipes = await getFeaturedMealRecipes();
      
      res.json(featuredRecipes);
    } catch (error) {
      console.error("Error refreshing featured recipes:", error);
      res.status(500).json({ message: "Failed to refresh featured recipes" });
    }
  });

  // Delete a meal recipe (admin only)
  app.delete("/api/meal-recipes/:id", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await deleteMealRecipe(id);
      
      if (!success) {
        return res.status(404).json({ message: "Meal recipe not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting meal recipe ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete meal recipe" });
    }
  });

  // Saved Meals (Personal Meal Library) API Endpoints
  app.get("/api/saved-meals", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Filter by meal type if provided
      if (req.query.type) {
        const mealType = req.query.type as string;
        const meals = await storage.getSavedMealsByType(userId, mealType);
        return res.json(meals);
      }
      
      // Get all saved meals
      const meals = await storage.getSavedMeals(userId);
      res.json(meals);
    } catch (error) {
      console.error("Error fetching saved meals:", error);
      res.status(500).json({ message: "Failed to fetch saved meals" });
    }
  });
  
  app.get("/api/saved-meals/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const meal = await storage.getSavedMeal(id);
      
      if (!meal) {
        return res.status(404).json({ message: "Saved meal not found" });
      }
      
      // Check if the user has permission to view this meal
      if (meal.userId !== req.user!.id && !req.user!.isAdmin) {
        return res.status(403).json({ message: "You don't have permission to access this meal" });
      }
      
      res.json(meal);
    } catch (error) {
      console.error("Error fetching saved meal:", error);
      res.status(500).json({ message: "Failed to fetch saved meal" });
    }
  });
  
  app.post("/api/saved-meals", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Validate meal data
      const validatedData = insertSavedMealSchema.parse(req.body);
      
      // Create the saved meal
      const newMeal = await storage.createSavedMeal(userId, validatedData);
      
      res.status(201).json(newMeal);
    } catch (error) {
      console.error("Error creating saved meal:", error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid meal data", 
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        res.status(500).json({ message: "Failed to create saved meal" });
      }
    }
  });
  
  app.post("/api/saved-meals/from-recipe/:recipeId", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const recipeId = parseInt(req.params.recipeId);
      
      // Get the recipe from the database
      const recipe = await getMealRecipeById(recipeId);
      
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      // Create a saved meal from the recipe
      const savedMealData: InsertSavedMeal = {
        name: recipe.name,
        description: recipe.description,
        mealType: recipe.mealType,
        servingSize: 1, // Default serving size
        servingUnit: "serving", // Default serving unit
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        sourceRecipeId: recipe.id
      };
      
      // Create the saved meal
      const newMeal = await storage.createSavedMeal(userId, savedMealData);
      
      res.status(201).json(newMeal);
    } catch (error) {
      console.error("Error saving recipe to personal library:", error);
      res.status(500).json({ message: "Failed to save recipe to personal library" });
    }
  });
  
  app.put("/api/saved-meals/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get the meal to check ownership
      const meal = await storage.getSavedMeal(id);
      
      if (!meal) {
        return res.status(404).json({ message: "Saved meal not found" });
      }
      
      // Ensure the user owns this meal entry
      if (meal.userId !== userId && !req.user!.isAdmin) {
        return res.status(403).json({ message: "You don't have permission to update this meal" });
      }
      
      // Validate and update meal data
      const validatedData = insertSavedMealSchema.partial().parse(req.body);
      const updatedMeal = await storage.updateSavedMeal(id, validatedData);
      
      if (!updatedMeal) {
        return res.status(404).json({ message: "Saved meal not found" });
      }
      
      res.json(updatedMeal);
    } catch (error) {
      console.error("Error updating saved meal:", error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid meal data", 
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        res.status(500).json({ message: "Failed to update saved meal" });
      }
    }
  });
  
  app.delete("/api/saved-meals/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get the meal to check ownership
      const meal = await storage.getSavedMeal(id);
      
      if (!meal) {
        return res.status(404).json({ message: "Saved meal not found" });
      }
      
      // Ensure the user owns this meal entry
      if (meal.userId !== userId && !req.user!.isAdmin) {
        return res.status(403).json({ message: "You don't have permission to delete this meal" });
      }
      
      const success = await storage.deleteSavedMeal(id);
      
      if (!success) {
        return res.status(404).json({ message: "Saved meal not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting saved meal:", error);
      res.status(500).json({ message: "Failed to delete saved meal" });
    }
  });

  // ===== Trainer Management API Routes =====
  
  // Get all trainers
  app.get("/api/trainers", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const trainers = await storage.getTrainers();
      res.status(200).json(trainers);
    } catch (error) {
      console.error("Error fetching trainers:", error);
      res.status(500).json({ message: "Failed to fetch trainers" });
    }
  });
  
  // Get clients for a trainer
  app.get("/api/trainers/:trainerId/clients", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const trainerId = parseInt(req.params.trainerId);
      const userId = req.user!.id;
      
      // Only admins or the trainer themselves can see their clients
      if (!req.user!.isAdmin && userId !== trainerId) {
        return res.status(403).json({ message: "You don't have permission to view these clients" });
      }
      
      const clients = await storage.getTrainerClients(trainerId);
      res.status(200).json(clients);
    } catch (error) {
      console.error("Error fetching trainer clients:", error);
      res.status(500).json({ message: "Failed to fetch trainer clients" });
    }
  });
  
  // Get trainers for a client
  app.get("/api/clients/:clientId/trainers", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const userId = req.user!.id;
      
      // Only admins or the client themselves can see their trainers
      if (!req.user!.isAdmin && userId !== clientId) {
        return res.status(403).json({ message: "You don't have permission to view these trainers" });
      }
      
      const trainers = await storage.getClientTrainers(clientId);
      res.status(200).json(trainers);
    } catch (error) {
      console.error("Error fetching client trainers:", error);
      res.status(500).json({ message: "Failed to fetch client trainers" });
    }
  });
  
  // Admin routes for trainer management
  
  // Make a user a trainer
  app.post("/api/admin/trainers/:userId", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const updatedUser = await storage.makeUserTrainer(userId);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error making user trainer:", error);
      res.status(500).json({ message: "Failed to update user to trainer" });
    }
  });
  
  // Remove trainer status from a user
  app.delete("/api/admin/trainers/:userId", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const updatedUser = await storage.removeTrainerStatus(userId);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error removing trainer status:", error);
      res.status(500).json({ message: "Failed to remove trainer status" });
    }
  });
  
  // Assign a client to a trainer
  app.post("/api/admin/trainers/:trainerId/clients/:clientId", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const trainerId = parseInt(req.params.trainerId);
      const clientId = parseInt(req.params.clientId);
      const { notes } = req.body;
      
      const relationship = await storage.assignClientToTrainer(trainerId, clientId, notes);
      res.status(200).json(relationship);
    } catch (error) {
      console.error("Error assigning client to trainer:", error);
      res.status(500).json({ message: "Failed to assign client to trainer" });
    }
  });
  
  // Remove a client from a trainer
  app.delete("/api/admin/trainers/:trainerId/clients/:clientId", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const trainerId = parseInt(req.params.trainerId);
      const clientId = parseInt(req.params.clientId);
      
      const success = await storage.removeClientFromTrainer(trainerId, clientId);
      
      if (!success) {
        return res.status(404).json({ message: "Trainer-client relationship not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing client from trainer:", error);
      res.status(500).json({ message: "Failed to remove client from trainer" });
    }
  });
  
  // Update trainer-client notes
  app.put("/api/admin/trainer-client/:relationshipId", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const relationshipId = parseInt(req.params.relationshipId);
      const { notes } = req.body;
      
      if (!notes) {
        return res.status(400).json({ message: "Notes are required" });
      }
      
      const updated = await storage.updateTrainerClientNotes(relationshipId, notes);
      
      if (!updated) {
        return res.status(404).json({ message: "Trainer-client relationship not found" });
      }
      
      res.status(200).json(updated);
    } catch (error) {
      console.error("Error updating trainer-client notes:", error);
      res.status(500).json({ message: "Failed to update trainer-client notes" });
    }
  });
  
  // Remove trainer-client relationship (end the trainer-client relationship)
  app.delete("/api/trainer/clients/:relationshipId", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const relationshipId = parseInt(req.params.relationshipId);
      
      // Verify this relationship belongs to the requesting trainer
      const trainerClients = await storage.getTrainerClients(req.user!.id);
      const relationship = trainerClients.find(tc => tc.relationship.id === relationshipId);
      
      if (!relationship && !req.user!.isAdmin) {
        return res.status(403).json({ message: "You don't have permission to end this client relationship" });
      }
      
      const success = await storage.removeTrainerClient(relationshipId);
      
      if (!success) {
        return res.status(404).json({ message: "Trainer-client relationship not found" });
      }
      
      // If successful, respond with a success message
      res.status(200).json({ 
        message: "Client relationship has been ended",
        clientId: relationship?.client.id,
        clientName: relationship?.client.username
      });
    } catch (error) {
      console.error("Error ending trainer-client relationship:", error);
      res.status(500).json({ message: "Failed to end trainer-client relationship" });
    }
  });
  
  // ===== Trainer-Client Request Management =====
  
  // Get pending requests for a trainer
  app.get("/api/trainer/requests", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;
      const requests = await storage.getTrainerClientRequests(trainerId);
      res.status(200).json(requests);
    } catch (error) {
      console.error("Error fetching trainer requests:", error);
      res.status(500).json({ message: "Failed to fetch trainer requests" });
    }
  });
  
  // Get pending requests for a client
  app.get("/api/client/requests", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const clientId = req.user!.id;
      const requests = await storage.getClientTrainerRequests(clientId);
      res.status(200).json(requests);
    } catch (error) {
      console.error("Error fetching client requests:", error);
      res.status(500).json({ message: "Failed to fetch client requests" });
    }
  });
  
  // Get trainers for the current client (used by MessagesPage)
  app.get("/api/client/trainers", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const clientId = req.user!.id;
      
      // Direct database query for reliability
      const trainerRelationships = await db
        .select()
        .from(trainerClients)
        .where(eq(trainerClients.clientId, clientId));
      
      if (trainerRelationships.length === 0) {
        return res.status(200).json([]);
      }
      
      // Fetch trainer details for each relationship
      const trainersWithDetails = await Promise.all(
        trainerRelationships.map(async (relation) => {
          const trainerUser = await storage.getUser(relation.trainerId);
          if (!trainerUser) {
            return null;
          }
          
          return {
            trainer: {
              id: trainerUser.id,
              username: trainerUser.username,
              email: trainerUser.email
            },
            relationship: relation
          };
        })
      );
      
      // Filter out any null values (trainers that weren't found)
      const validTrainers = trainersWithDetails.filter(t => t !== null);
      
      res.status(200).json(validTrainers);
    } catch (error) {
      console.error("Error fetching client's trainers:", error);
      res.status(200).json([]); // Return empty array instead of error for better UX
    }
  });
  
  // Create a new trainer-client request (trainer requesting to connect with a client)
  app.post("/api/trainer/requests", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;
      const { clientId, message } = req.body;
      
      if (!clientId) {
        return res.status(400).json({ message: "Client ID is required" });
      }
      
      // Verify the client exists
      const client = await storage.getUser(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Check if a relationship already exists
      const existingClients = await storage.getTrainerClients(trainerId);
      if (existingClients.some(c => c.client.id === clientId)) {
        return res.status(400).json({ message: "You are already connected with this client" });
      }
      
      // Check if a request already exists
      const existingRequests = await storage.getTrainerClientRequests(trainerId);
      if (existingRequests.some(r => r.clientId === clientId && r.status === "pending")) {
        return res.status(400).json({ message: "A pending request already exists for this client" });
      }
      
      // Create the request
      const request = await storage.createTrainerClientRequest({
        trainerId,
        clientId,
        status: "pending",
        message: message || `Trainer ${req.user!.username} would like to connect with you.`
      });
      
      // Send real-time notification to the client
      broadcastToUser(clientId, 'trainer_request_received', {
        request,
        trainerName: req.user!.username,
        message: `Trainer ${req.user!.username} would like to connect with you.`
      });
      
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating trainer request:", error);
      res.status(500).json({ message: "Failed to create trainer request" });
    }
  });
  
  // Respond to a trainer-client request (accept or reject)
  app.put("/api/client/requests/:requestId", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { status } = req.body;
      const userId = req.user!.id;
      
      console.log(`Client ${userId} responding to request ${requestId} with status: ${status}`);
      
      if (!status || !["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Valid status (accepted or rejected) is required" });
      }
      
      // First get the request to verify it's for this user
      const request = await storage.getTrainerClientRequestById(requestId);
      
      if (!request) {
        console.log(`Request ${requestId} not found`);
        return res.status(404).json({ message: "Request not found" });
      }
      
      console.log(`Found request: ${JSON.stringify(request)}`);
      
      // Verify this user is the client in the request
      if (request.clientId !== userId) {
        console.log(`Unauthorized: request client ID ${request.clientId} does not match user ID ${userId}`);
        return res.status(403).json({ message: "You are not authorized to respond to this request" });
      }
      
      // Check if the request has already been responded to
      if (request.status !== 'pending') {
        console.log(`Request already ${request.status}, cannot update`);
        return res.status(400).json({ 
          message: `This request has already been ${request.status}` 
        });
      }
      
      // If accepting, check if the user already has a trainer
      if (status === "accepted") {
        const existingTrainers = await storage.getClientTrainers(userId);
        
        if (existingTrainers.length > 0) {
          console.log(`Client ${userId} already has ${existingTrainers.length} trainers assigned`);
          return res.status(400).json({ 
            message: "You already have a trainer assigned. A client can only have one trainer at a time." 
          });
        }
      }
      
      console.log(`Updating request ${requestId} status to ${status}`);
      
      // Update the request status
      const updatedRequest = await storage.respondToTrainerClientRequest(requestId, status);
      
      if (!updatedRequest) {
        console.log(`Failed to update request ${requestId}`);
        return res.status(404).json({ message: "Request not found or could not be updated" });
      }
      
      console.log(`Request updated successfully: ${JSON.stringify(updatedRequest)}`);
      
      // Send real-time notification to the trainer about the client's response
      broadcastToUser(updatedRequest.trainerId, 'trainer_request_updated', {
        request: updatedRequest,
        clientId: userId,
        clientName: req.user!.username,
        status,
        message: `Client ${req.user!.username} has ${status} your connection request.`,
        isTrainer: true
      });
      
      // If the client accepted, also establish the trainer-client relationship
      if (status === "accepted") {
        try {
          console.log(`Creating trainer-client relationship between trainer ${updatedRequest.trainerId} and client ${userId}`);
          
          // Create the trainer-client relationship
          const relationship = await storage.assignClientToTrainer(
            updatedRequest.trainerId, 
            userId,
            `Relationship established via client acceptance on ${new Date().toISOString()}`
          );
          
          console.log(`Relationship created: ${JSON.stringify(relationship)}`);
          
          // Broadcast relationship creation to both parties
          broadcastToUser(updatedRequest.trainerId, 'trainer_client_connected', {
            relationship,
            clientName: req.user!.username
          });
          
          broadcastToUser(userId, 'trainer_client_connected', {
            relationship,
            trainerName: (await storage.getUser(updatedRequest.trainerId))?.username || 'Your trainer'
          });
        } catch (relationshipError) {
          console.error("Error creating trainer-client relationship:", relationshipError);
          // We'll still return success since the request was updated correctly
        }
      }
      
      res.status(200).json(updatedRequest);
    } catch (error) {
      console.error("Error responding to request:", error);
      res.status(500).json({ message: "Failed to respond to request" });
    }
  });
  
  // Delete a trainer-client request
  app.delete("/api/trainer/requests/:requestId", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const success = await storage.deleteTrainerClientRequest(requestId);
      
      if (!success) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting request:", error);
      res.status(500).json({ message: "Failed to delete request" });
    }
  });
  
  // ===== Trainer-Client Messaging =====
  
  // Send a message between trainer and client
  app.post("/api/messages", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { trainerId, clientId, content } = req.body;
      const senderId = req.user!.id;
      
      if (!trainerId || !clientId || !content || !content.trim()) {
        return res.status(400).json({ message: "trainerId, clientId and content are required" });
      }
      
      // Parse IDs to integers if they're strings
      const trainerIdNum = typeof trainerId === 'string' ? parseInt(trainerId) : trainerId;
      const clientIdNum = typeof clientId === 'string' ? parseInt(clientId) : clientId;
      
      // Verify that the sender is either the trainer or the client
      if (senderId !== trainerIdNum && senderId !== clientIdNum) {
        return res.status(403).json({ message: "Unauthorized to send messages for these users" });
      }
      
      // Check for an active trainer-client relationship without failing if new
      const trainerClients = await storage.getTrainerClients(trainerIdNum);
      const isValidRelationship = trainerClients.some(tc => tc.client.id === clientIdNum);
      
      // We'll now check either relationship direction (in case a trainer was just assigned)
      if (!isValidRelationship) {
        const clientTrainers = await storage.getClientTrainers(clientIdNum);
        const hasRelationship = clientTrainers.some(ct => ct.trainer.id === trainerIdNum);
        
        if (!hasRelationship) {
          return res.status(403).json({ message: "No active trainer-client relationship exists" });
        }
      }
      
      const message = await storage.createTrainerMessage({
        trainerId: trainerIdNum,
        clientId: clientIdNum,
        senderId,
        content: content.trim(),
        isRead: false
      });
      
      // Determine the recipient (the other party in the conversation)
      const recipientId = senderId === trainerIdNum ? clientIdNum : trainerIdNum;
      
      // Broadcast to sender (confirmation)
      broadcastToUser(senderId, 'message_sent', message);
      
      // Broadcast to recipient (notification)
      broadcastToUser(recipientId, 'message_received', {
        ...message,
        isNew: true // Flag to indicate this is a new message notification
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Error sending message" });
    }
  });
  
  // Get messages between trainer and client
  app.get("/api/messages/:trainerId/:clientId", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const trainerId = parseInt(req.params.trainerId);
      const clientId = parseInt(req.params.clientId);
      const userId = req.user!.id;
      
      // Verify that the requester is either the trainer or the client
      if (userId !== trainerId && userId !== clientId) {
        return res.status(403).json({ message: "Unauthorized to view these messages" });
      }
      
      // Check for an active trainer-client relationship without failing if new
      const trainerClients = await storage.getTrainerClients(trainerId);
      const isValidRelationship = trainerClients.some(tc => tc.client.id === clientId);
      
      // We'll now check either relationship direction (in case a trainer was just assigned)
      if (!isValidRelationship) {
        const clientTrainers = await storage.getClientTrainers(clientId);
        const hasRelationship = clientTrainers.some(ct => ct.trainer.id === trainerId);
        
        if (!hasRelationship) {
          // If still no relationship is found, return empty messages array rather than error
          // This allows new trainer-client relationships to work immediately
          return res.json([]);
        }
      }
      
      const messages = await storage.getTrainerClientMessages(trainerId, clientId);
      
      // Mark messages as read for the requester (if they are not the sender)
      const messagesToMark = messages
        .filter(m => m.senderId !== userId && !m.isRead)
        .map(m => m.id);
      
      if (messagesToMark.length > 0) {
        await storage.markMessagesAsRead(userId, messagesToMark);
        
        // Also invalidate the unread count
        await storage.getUnreadMessagesCount(userId);
      }
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Error fetching messages" });
    }
  });
  
  // Get unread message count for a user
  app.get("/api/messages/unread/count", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      // For security, we only let users check their own unread messages
      const userId = req.user!.id;

      // Always return a count of 0 if user is not in a trainer-client relationship
      // This simplifies client code and prevents 403 errors
      try {
        // Check if the user is in any trainer-client relationships
        const trainerRelationships = await storage.getTrainerClients(userId);
        const clientRelationships = await storage.getClientTrainers(userId);
        
        // If user has no relationships, return 0 count immediately
        if (trainerRelationships.length === 0 && clientRelationships.length === 0) {
          return res.json({ count: 0 });
        }
        
        // First check if the messages table exists to avoid errors
        try {
          // Simple query to check if table exists
          await db.execute(sql`SELECT 1 FROM trainer_messages LIMIT 1`);
        } catch (tableCheckErr) {
          // Table doesn't exist yet, just return 0 count
          console.log("Messages table doesn't exist yet");
          return res.json({ count: 0 });
        }
        
        // Always return a valid count response - never an error for this endpoint
        try {
          // Get unread message count for the user
          const count = await storage.getUnreadMessagesCount(userId);
          return res.json({ count });
        } catch (countError) {
          console.warn("Error getting unread count, returning 0:", countError);
          return res.json({ count: 0 });
        }
      } catch (error) {
        console.warn("Error checking trainer-client relationships, returning 0:", error);
        return res.json({ count: 0 });
      }
    } catch (error) {
      console.error("Error getting unread message count:", error);
      // Return 0 instead of an error to avoid console spam for clients
      return res.json({ count: 0 });
    }
  });
  
  // Mark messages as read
  app.put("/api/messages/read", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { messageIds } = req.body;
      
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ message: "Invalid message IDs" });
      }
      
      const success = await storage.markMessagesAsRead(req.user!.id, messageIds);
      res.json({ success });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Error marking messages as read" });
    }
  });
  
  // ===== Trainer-specific Routes =====
  
  // Trainer: Search for potential clients
  app.get("/api/trainer/search-clients", ensureTrainer, async (req: Request, res: Response) => {
    try {
      console.log("Search clients request:", req.query);
      const searchQuery = req.query.search as string;
      
      if (!searchQuery || searchQuery.length < 2) {
        console.log("Search query too short:", searchQuery);
        return res.status(400).json({ message: "Search query must be at least 2 characters" });
      }
      
      console.log(`Searching for users with query: "${searchQuery}"`);
      const users = await storage.searchUsersByUsername(searchQuery);
      console.log(`Found ${users.length} users before filtering`);
      
      // Filter out users that are already clients of this trainer
      const trainerId = req.user!.id;
      const trainerClients = await storage.getTrainerClients(trainerId);
      const clientIds = trainerClients.map(tc => tc.client.id);
      console.log(`Trainer has ${clientIds.length} existing clients`);
      
      // Also filter out users who already have pending requests
      const pendingRequests = await storage.getTrainerClientRequests(trainerId);
      const pendingRequestClientIds = pendingRequests
        .filter(r => r.status === 'pending')
        .map(r => r.clientId);
      console.log(`Trainer has ${pendingRequestClientIds.length} pending requests`);
      
      // Combine IDs to exclude
      const excludeIds = [trainerId, ...clientIds, ...pendingRequestClientIds];
      console.log(`Total IDs to exclude: ${excludeIds.length}`);
      
      // Filter users who aren't already clients or have pending requests,
      // and who don't already have trainers assigned
      const filteredUsers = [];
      
      for (const user of users) {
        // Skip users that are in the exclude list
        if (excludeIds.includes(user.id)) {
          console.log(`Skipping user ${user.username} (ID: ${user.id}) - in exclude list`);
          continue;
        }
        
        // Skip users who already have trainers
        console.log(`Checking if user ${user.username} (ID: ${user.id}) has trainers`);
        const hasTrainers = await storage.userHasTrainers(user.id);
        if (hasTrainers) {
          console.log(`Skipping user ${user.username} (ID: ${user.id}) - already has a trainer`);
          continue;
        }
        
        console.log(`Adding user ${user.username} (ID: ${user.id}) to search results`);
        // If passes all filters, add to the filtered list
        filteredUsers.push(user);
      }
      
      // Return safe user data
      const safeUsers = filteredUsers.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email || ''
      }));
      
      res.status(200).json(safeUsers);
    } catch (error) {
      console.error("Error searching clients:", error);
      res.status(500).json({ message: "Failed to search for clients" });
    }
  });
  
  // Trainer: Get clients that the trainer is assigned to
  app.get("/api/trainer/clients", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;
      const clients = await storage.getTrainerClients(trainerId);
      res.status(200).json(clients);
    } catch (error) {
      console.error("Error fetching trainer's clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });
  
  // Trainer: Get all fitness plans created by this trainer
  app.get("/api/trainer/plans", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;
      
      // Get all fitness plans created by this trainer
      const plans = await storage.getTrainerPlans(trainerId);
      
      res.status(200).json(plans || []);
    } catch (error) {
      console.error("Error fetching trainer plans:", error);
      res.status(500).json({ message: "Failed to fetch trainer plans" });
    }
  });
  
  // Trainer: Get all client fitness plans for this trainer
  app.post("/api/trainer/clients/:clientId/fitness-plan", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;
      const clientId = parseInt(req.params.clientId);
      
      // Verify client belongs to this trainer
      const trainerClients = await storage.getTrainerClients(trainerId);
      const isClient = trainerClients.some(tc => tc.client.id === clientId);
      
      if (!isClient) {
        return res.status(403).json({ message: "Not authorized to create plan for this client" });
      }
      
      // Extract plan data from request
      const { name, goal, durationWeeks, type, level, description } = req.body;
      
      // Ensure durationWeeks is a valid number
      const validDurationWeeks = parseInt(durationWeeks) || 4; // Default to 4 weeks if invalid
      
      // Calculate dates safely
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + (validDurationWeeks * 7)); // Add weeks
      
      // Create the fitness plan - properly structured according to the schema
      const newPlan = await storage.createFitnessPlan(clientId, {
        preferences: {
          name: name,
          goal: goal,
          durationWeeks: validDurationWeeks,
          type: type,
          level: level,
          description: description,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        workoutPlan: {
          weeklySchedule: req.body.workoutPlan?.weeklySchedule || {},
          notes: req.body.workoutPlan?.notes || ""
        },
        mealPlan: {
          weeklyMeals: req.body.mealPlan?.dailyMeals || req.body.mealPlan?.weeklyMeals || {},
          notes: req.body.mealPlan?.notes || ""
        },
        isActive: true
      });
      
      // Send WebSocket notification to client about new plan assignment
      try {
        console.log(`Broadcasting plan_assigned event to client ${clientId}`);
        
        // Broadcast the plan assigned event to the client
        broadcastToUser(clientId, 'plan_assigned', {
          planId: newPlan.id,
          trainerId: trainerId,
          clientId: clientId,
          planName: name
        });
        
        // Also broadcast fitness_plan_updated event which is already being handled by clients
        broadcastToUser(clientId, 'fitness_plan_updated', {
          planId: newPlan.id,
          message: `Your trainer has assigned you a new fitness plan: ${name}`,
          action: 'created'
        });
      } catch (wsError) {
        console.error(`Error broadcasting plan assignment to client ${clientId}:`, wsError);
        // Don't fail the request if WebSocket notification fails
      }
      
      return res.status(201).json(newPlan);
    } catch (error) {
      console.error("Error creating fitness plan:", error);
      return res.status(500).json({ message: "Failed to create fitness plan", error: String(error) });
    }
  });

  app.get("/api/trainer/client-plans", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;
      
      console.log(`Fetching client plans for trainer ID: ${trainerId}`);
      
      // Get all clients for this trainer
      const clients = await storage.getTrainerClients(trainerId);
      console.log(`Found ${clients?.length || 0} clients for trainer`);
      
      // If no clients, return empty array
      if (!clients || clients.length === 0) {
        return res.status(200).json([]);
      }
      
      // Gather all fitness plans for these clients
      const clientPlans = [];
      
      for (const client of clients) {
        const clientId = client.client.id;
        console.log(`Looking for fitness plans for client ID: ${clientId}`);
        
        // Get all fitness plans for this client, not just active ones
        const [fitnessPlan] = await db
          .select()
          .from(fitnessPlans)
          .where(eq(fitnessPlans.userId, clientId))
          .orderBy(desc(fitnessPlans.isActive), desc(fitnessPlans.createdAt))
          .limit(1);
        
        if (fitnessPlan) {
          console.log(`Found fitness plan ID: ${fitnessPlan.id} for client ID: ${clientId}`);
          clientPlans.push({
            id: fitnessPlan.id,
            clientId: clientId,
            client: {
              id: client.client.id,
              username: client.client.username,
              email: client.client.email
            },
            fitnessPlan: fitnessPlan
          });
        } else {
          console.log(`No fitness plans found for client ID: ${clientId}`);
        }
      }
      
      console.log(`Returning ${clientPlans.length} client plans`);
      res.status(200).json(clientPlans);
    } catch (error) {
      console.error("Error fetching client plans:", error);
      res.status(500).json({ message: "Failed to fetch client plans" });
    }
  });
  
  // Trainer: Get specific client details
  app.get("/api/trainer/clients/:clientId", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;
      const clientId = parseInt(req.params.clientId);
      
      // Verify that this client is assigned to this trainer
      const clients = await storage.getTrainerClients(trainerId);
      const clientRelationship = clients.find(c => c.client.id === clientId);
      
      if (!clientRelationship && !req.user!.isAdmin) {
        return res.status(403).json({ message: "This client is not assigned to you" });
      }
      
      const client = await storage.getUser(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Get client's fitness plan
      const fitnessPlan = await storage.getActiveFitnessPlan(clientId);
      
      // Get client's nutrition goals
      const nutritionGoal = await storage.getNutritionGoal(clientId);
      
      // Get client's weights
      const weights = await storage.getWeights(clientId);
      
      // Get client's most recent weight
      const latestWeight = await storage.getLatestWeight(clientId);
      
      // Get client's workouts for the trainer view
      const workouts = await storage.getWorkouts(clientId);
      
      // Get client's meals for the trainer view
      const meals = await storage.getMeals(clientId);
      
      res.status(200).json({
        client,
        relationship: clientRelationship?.relationship,
        fitnessPlan,
        nutritionGoal,
        weights,
        latestWeight,
        workouts,
        meals
      });
    } catch (error) {
      console.error("Error fetching client details:", error);
      res.status(500).json({ message: "Failed to fetch client details" });
    }
  });
  
  // Trainer: Update notes for client
  app.put("/api/trainer/clients/:clientId/notes", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;
      const clientId = parseInt(req.params.clientId);
      const { notes } = req.body;
      
      if (!notes) {
        return res.status(400).json({ message: "Notes are required" });
      }
      
      // Verify that this client is assigned to this trainer
      const clients = await storage.getTrainerClients(trainerId);
      const clientRelationship = clients.find(c => c.client.id === clientId);
      
      if (!clientRelationship && !req.user!.isAdmin) {
        return res.status(403).json({ message: "This client is not assigned to you" });
      }
      
      const updated = await storage.updateTrainerClientNotes(clientRelationship!.relationship.id, notes);
      
      if (!updated) {
        return res.status(404).json({ message: "Relationship not found" });
      }
      
      // Send real-time notification to the client that their notes have been updated
      broadcastToUser(clientId, 'trainer_updated_notes', {
        relationship: updated,
        trainerName: req.user!.username,
        message: `Your trainer ${req.user!.username} has updated your training notes`
      });
      
      res.status(200).json(updated);
    } catch (error) {
      console.error("Error updating client notes:", error);
      res.status(500).json({ message: "Failed to update client notes" });
    }
  });
  
  // Trainer: Update a client's fitness plan notes
  app.patch("/api/fitness-plans/:planId/notes", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;
      const planId = parseInt(req.params.planId);
      const { workoutNotes, mealNotes } = req.body;
      
      // First fetch the plan to verify it belongs to a client of this trainer
      const plan = await storage.getFitnessPlan(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Fitness plan not found" });
      }
      
      // Check if this plan belongs to a client of this trainer
      const clients = await storage.getTrainerClients(trainerId);
      const isClientOfTrainer = clients.some(c => c.client.id === plan.userId);
      
      if (!isClientOfTrainer && !req.user!.isAdmin) {
        return res.status(403).json({ message: "You are not authorized to modify this plan" });
      }
      
      // Update plan notes
      const updatedPlan = await storage.updateFitnessPlanNotes(planId, workoutNotes, mealNotes);
      
      if (!updatedPlan) {
        return res.status(404).json({ message: "Failed to update plan notes" });
      }
      
      // Send real-time notification to the client
      broadcastToUser(plan.userId, 'trainer_updated_plan', {
        planId: planId,
        trainerName: req.user!.username,
        message: `Your trainer ${req.user!.username} has updated your fitness plan notes`
      });
      
      res.status(200).json(updatedPlan);
    } catch (error) {
      console.error("Error updating fitness plan notes:", error);
      res.status(500).json({ message: "Failed to update fitness plan notes" });
    }
  });
  
  // Trainer: Remove a client from their roster
  app.delete("/api/trainer/clients/:clientId", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;
      const clientId = parseInt(req.params.clientId);
      
      // Make sure client is assigned to this trainer
      const clients = await storage.getTrainerClients(trainerId);
      const clientRelationship = clients.find(c => c.client.id === clientId);
      
      if (!clientRelationship && !req.user!.isAdmin) {
        return res.status(403).json({ message: "This client is not assigned to you" });
      }
      
      const success = await storage.removeClientFromTrainer(trainerId, clientId);
      
      if (!success) {
        return res.status(404).json({ message: "Failed to remove client" });
      }
      
      // Send real-time notification to the client
      broadcastToUser(clientId, 'trainer_removed_client', {
        trainerName: req.user!.username,
        message: `Your trainer ${req.user!.username} has removed you from their client roster`
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing client from trainer:", error);
      res.status(500).json({ message: "Failed to remove client from trainer" });
    }
  });
  
  // Redirect to the implementation in trainerRoutes.ts
  app.post("/api/trainer/clients/:clientId/workouts", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;
      const clientId = parseInt(req.params.clientId);
      
      console.log(`Trainer ${trainerId} creating workout for client ${clientId}`);
      console.log("Request body:", JSON.stringify(req.body));
      
      // Verify that this client is assigned to this trainer
      const clients = await storage.getTrainerClients(trainerId);
      const clientRelationship = clients.find(c => c.client.id === clientId);
      
      if (!clientRelationship && !req.user!.isAdmin) {
        return res.status(403).json({ message: "This client is not assigned to you" });
      }
      
      // Check if data is in the format { workout: {...}, exercises: [...] }
      // or directly as { ...workoutData, exercises: [...] }
      let workoutData, exercises;
      
      if (req.body.workout) {
        // Format: { workout: {...}, exercises: [...] }
        workoutData = req.body.workout;
        exercises = req.body.exercises || [];
        console.log("Using nested workout format");
      } else {
        // Format: { ...workoutData, exercises: [...] }
        const { exercises: extractedExercises = [], ...extractedWorkoutData } = req.body;
        workoutData = extractedWorkoutData;
        exercises = extractedExercises;
        console.log("Using flat workout format");
      }
      
      console.log("Workout data:", JSON.stringify(workoutData));
      console.log("Exercises:", exercises ? JSON.stringify(exercises) : "[]");
      
      // Convert string date to Date object if it's a string
      const processedWorkoutData = {
        ...workoutData,
        date: workoutData.date ? new Date(workoutData.date) : new Date(),
        userId: clientId // Ensure workout is assigned to client
      };
      
      console.log("Processed workout data:", JSON.stringify(processedWorkoutData));
      
      // Validate workout data
      const validWorkoutData = insertWorkoutSchema.parse(processedWorkoutData);
      console.log("Valid workout data:", JSON.stringify(validWorkoutData));
      
      // Create workout for client
      const newWorkout = await storage.createWorkout(clientId, validWorkoutData);
      console.log("Created workout:", JSON.stringify(newWorkout));
      
      // Create exercises if provided
      const savedExercises = [];
      if (Array.isArray(exercises)) {
        console.log(`Processing ${exercises.length} exercises`);
        for (const exercise of exercises) {
          console.log("Processing exercise:", JSON.stringify(exercise));
          const validExerciseData = insertExerciseSchema.parse({
            ...exercise,
            workoutId: newWorkout.id
          });
          
          console.log("Valid exercise data:", JSON.stringify(validExerciseData));
          const savedExercise = await storage.createExercise(validExerciseData);
          savedExercises.push(savedExercise);
        }
      }
      
      // Prepare the complete workout data with exercises
      const completeWorkout = { ...newWorkout, exercises: savedExercises };
      
      // Broadcast workout creation to client
      broadcastToUser(clientId, 'trainer_created_workout', {
        workout: completeWorkout,
        trainerName: req.user!.username,
        message: `Your trainer ${req.user!.username} has created a new workout for you`
      });
      
      res.status(201).json(completeWorkout);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation error:", error.errors);
        res.status(400).json({ 
          message: "Invalid workout data", 
          errors: error.errors,
          formattedErrors: error.format()
        });
      } else {
        console.error("Workout creation error:", error);
        res.status(500).json({ message: "Failed to create workout for client" });
      }
    }
  });
  
  // Trainer: Create nutrition goal for client
  app.post("/api/trainer/clients/:clientId/nutrition-goal", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;
      const clientId = parseInt(req.params.clientId);
      
      // Verify that this client is assigned to this trainer
      const clients = await storage.getTrainerClients(trainerId);
      const clientRelationship = clients.find(c => c.client.id === clientId);
      
      if (!clientRelationship && !req.user!.isAdmin) {
        return res.status(403).json({ message: "This client is not assigned to you" });
      }
      
      const nutritionGoalData = insertNutritionGoalSchema.parse(req.body);
      const nutritionGoal = await storage.setNutritionGoal(clientId, nutritionGoalData);
      
      // Broadcast nutrition goal update to client
      broadcastToUser(clientId, 'trainer_updated_nutrition', {
        nutritionGoal,
        trainerName: req.user!.username,
        message: `Your trainer ${req.user!.username} has updated your nutrition goals`
      });
      
      res.status(201).json(nutritionGoal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid nutrition goal data", errors: error.errors });
      } else {
        console.error("Nutrition goal creation error:", error);
        res.status(500).json({ message: "Failed to create nutrition goal for client" });
      }
    }
  });
  
  // ===== Trainer Client Nutrition Goals Management =====
  
  // Set nutrition goals for a client (trainer can set goals for their clients)
  app.post("/api/trainer/clients/:clientId/nutrition-goals", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const trainerId = req.user!.id;
      
      // Get the trainer's clients to verify relationship
      const clients = await storage.getTrainerClients(trainerId);
      const clientRelationship = clients.find(c => c.client.id === clientId);
      
      if (!clientRelationship && !req.user!.isAdmin) {
        return res.status(403).json({ message: "This client is not assigned to you" });
      }
      
      const nutritionGoalData = insertNutritionGoalSchema.parse(req.body);
      const nutritionGoal = await storage.setNutritionGoal(clientId, nutritionGoalData);
      
      // Broadcast nutrition goal update to client
      broadcastToUser(clientId, 'trainer_updated_nutrition', {
        nutritionGoal,
        trainerName: req.user!.username,
        message: `Your trainer ${req.user!.username} has updated your nutrition goals`
      });
      
      res.status(201).json(nutritionGoal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid nutrition goal data", errors: error.errors });
      } else {
        console.error("Nutrition goal creation error:", error);
        res.status(500).json({ message: "Failed to create nutrition goal for client" });
      }
    }
  });
  
  // Update nutrition goals for a client (trainer can update their client's goals)
  app.put("/api/trainer/clients/:clientId/nutrition-goals", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const trainerId = req.user!.id;
      
      // Get the trainer's clients to verify relationship
      const clients = await storage.getTrainerClients(trainerId);
      const clientRelationship = clients.find(c => c.client.id === clientId);
      
      if (!clientRelationship && !req.user!.isAdmin) {
        return res.status(403).json({ message: "This client is not assigned to you" });
      }
      
      // Get existing goals to ensure they exist
      const existingGoals = await storage.getNutritionGoal(clientId);
      if (!existingGoals) {
        return res.status(404).json({ message: "No nutrition goals found for this client. Please create goals first." });
      }
      
      const nutritionGoalData = insertNutritionGoalSchema.parse(req.body);
      const nutritionGoal = await storage.setNutritionGoal(clientId, nutritionGoalData);
      
      // Broadcast nutrition goal update to client
      broadcastToUser(clientId, 'trainer_updated_nutrition', {
        nutritionGoal,
        trainerName: req.user!.username,
        message: `Your trainer ${req.user!.username} has updated your nutrition goals`
      });
      
      res.status(200).json(nutritionGoal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid nutrition goal data", errors: error.errors });
      } else {
        console.error("Nutrition goal update error:", error);
        res.status(500).json({ message: "Failed to update nutrition goals" });
      }
    }
  });
  
  // ===== Trainer Client Workout Management =====
  
  // Get client workouts for management
  app.get("/api/trainer/clients/:clientId/workouts", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const trainerId = req.user!.id;
      
      // Get the trainer's clients to verify relationship
      const clients = await storage.getTrainerClients(trainerId);
      const clientRelationship = clients.find(c => c.client.id === clientId);
      
      if (!clientRelationship && !req.user!.isAdmin) {
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
  
  // Create a workout for a client
  // Endpoint was duplicate - removed to fix conflicts
  
  // Update a client's workout
  app.put("/api/trainer/clients/:clientId/workouts/:workoutId", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const workoutId = parseInt(req.params.workoutId);
      const trainerId = req.user!.id;
      
      console.log(`Trainer ${trainerId} updating workout ${workoutId} for client ${clientId}`);
      console.log("Request body:", JSON.stringify(req.body));
      
      // Get the trainer's clients to verify relationship
      const clients = await storage.getTrainerClients(trainerId);
      const clientRelationship = clients.find(c => c.client.id === clientId);
      
      if (!clientRelationship && !req.user!.isAdmin) {
        return res.status(403).json({ message: "This client is not assigned to you" });
      }
      
      // Verify the workout belongs to this client
      const workout = await storage.getWorkout(workoutId);
      if (!workout || workout.userId !== clientId) {
        return res.status(404).json({ message: "Workout not found for this client" });
      }
      
      // Check if data is in the format { workout: {...}, exercises: [...] }
      // or { workoutUpdate: {...}, exercises: [...] }
      let workoutUpdate, exercises;
      
      if (req.body.workout) {
        // Format: { workout: {...}, exercises: [...] }
        workoutUpdate = req.body.workout;
        exercises = req.body.exercises || [];
        console.log("Using nested workout format with workout property");
      } else if (req.body.workoutUpdate) {
        // Format: { workoutUpdate: {...}, exercises: [...] }
        workoutUpdate = req.body.workoutUpdate;
        exercises = req.body.exercises || [];
        console.log("Using nested workout format with workoutUpdate property");
      } else {
        // Format: { ...workoutData, exercises: [...] }
        const { exercises: extractedExercises = [], ...extractedWorkoutData } = req.body;
        workoutUpdate = extractedWorkoutData;
        exercises = extractedExercises;
        console.log("Using flat workout format");
      }
      
      console.log("Workout update data:", JSON.stringify(workoutUpdate));
      
      // Update the workout
      const updatedWorkout = await storage.updateWorkout(workoutId, workoutUpdate);
      
      // If exercises are provided, handle them
      if (Array.isArray(exercises)) {
        // Get existing exercises
        const existingExercises = await storage.getExercisesByWorkout(workoutId);
        
        // Delete all existing exercises for this workout
        for (const exercise of existingExercises) {
          await storage.deleteExercise(exercise.id);
        }
        
        // Create new exercises
        const newExercises = await Promise.all(
          exercises.map(exercise => 
            storage.createExercise({
              ...exercise,
              workoutId
            })
          )
        );
        
        // Broadcast workout update to client
        broadcastToUser(clientId, 'trainer_updated_workout', {
          workout: {
            ...updatedWorkout,
            exercises: newExercises
          },
          trainerName: req.user!.username,
          message: `Your trainer ${req.user!.username} has updated your workout`
        });
        
        return res.status(200).json({
          ...updatedWorkout,
          exercises: newExercises
        });
      }
      
      // If no exercises provided, just return the updated workout
      const updatedExercises = await storage.getExercisesByWorkout(workoutId);
      
      res.status(200).json({
        ...updatedWorkout,
        exercises: updatedExercises
      });
    } catch (error) {
      console.error("Error updating client workout:", error);
      res.status(500).json({ message: "Failed to update client workout" });
    }
  });
  
  // Delete a client's workout
  app.delete("/api/trainer/clients/:clientId/workouts/:workoutId", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const workoutId = parseInt(req.params.workoutId);
      const trainerId = req.user!.id;
      
      // Get the trainer's clients to verify relationship
      const clients = await storage.getTrainerClients(trainerId);
      const clientRelationship = clients.find(c => c.client.id === clientId);
      
      if (!clientRelationship && !req.user!.isAdmin) {
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
      
      // Broadcast workout deletion to client
      broadcastToUser(clientId, 'trainer_deleted_workout', {
        workoutId,
        trainerName: req.user!.username,
        message: `Your trainer ${req.user!.username} has deleted a workout`
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client workout:", error);
      res.status(500).json({ message: "Failed to delete client workout" });
    }
  });

  // Add a direct server endpoint to clear service workers and caches (admin only)
  app.get('/api/clear-cache', ensureAdmin, (req: Request, res: Response) => {
    // Return a script that will clear the service worker and caches
    res.setHeader('Content-Type', 'text/javascript');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const clearScript = `
      (async function() {
        // Unregister service workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
            console.log('Service worker unregistered');
          }
        }
        
        // Clear caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(name => caches.delete(name))
          );
          console.log('Caches cleared');
        }
        
        // Clear IndexedDB
        try {
          const dbNames = ['trackMadeEasEOfflineDB'];
          for (const name of dbNames) {
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess = () => console.log('IndexedDB cleared');
            request.onerror = () => console.error('Error clearing IndexedDB');
          }
        } catch (e) {
          console.error('Error clearing IndexedDB', e);
        }
        
        // Clear localStorage
        localStorage.clear();
        console.log('localStorage cleared');
        
        // Reload the page with cache busting
        setTimeout(() => {
          window.location.href = '/?v=' + Date.now();
        }, 500);
      })();
    `;
    
    res.send(clearScript);
  });
  
  // Admin cache management page
  app.get('/admin/cache', ensureAdmin, (req: Request, res: Response) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cache Clearing Options</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              max-width: 500px;
            }
            h1 {
              color: #333;
              margin-bottom: 1rem;
            }
            p {
              color: #666;
              margin-bottom: 2rem;
            }
            .buttons {
              display: flex;
              flex-direction: column;
              gap: 1rem;
            }
            .button {
              display: inline-block;
              padding: 0.75rem 1.5rem;
              border-radius: 4px;
              text-decoration: none;
              font-weight: bold;
              transition: background-color 0.2s;
            }
            .primary {
              background-color: #4caf50;
              color: white;
            }
            .primary:hover {
              background-color: #45a049;
            }
            .secondary {
              background-color: #f44336;
              color: white;
            }
            .secondary:hover {
              background-color: #d32f2f;
            }
            .tertiary {
              background-color: #2196f3;
              color: white;
            }
            .tertiary:hover {
              background-color: #0b7dda;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Admin Cache Management</h1>
            <p>Admin tools for clearing application caches and service workers:</p>
            <div class="buttons">
              <a href="/admin/clear-cache" class="button primary">Clear All Caches (Recommended)</a>
              <a href="/api/clear-cache" class="button secondary">Run JavaScript Cleanup</a>
              <a href="/admin/settings" class="button tertiary">Return to Admin Settings</a>
              <a href="/" class="button" style="background-color: #9c27b0; color: white;">Return to Dashboard</a>
            </div>
          </div>
        </body>
      </html>
    `);
  });

  // Admin-only page for service worker clear
  app.get('/admin/clear-cache', ensureAdmin, (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Clearing Cache</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              max-width: 500px;
            }
            h1 {
              color: #333;
            }
            .progress {
              margin: 2rem 0;
              height: 20px;
              background: #eee;
              border-radius: 10px;
              overflow: hidden;
            }
            .progress-bar {
              height: 100%;
              width: 0%;
              background: #4caf50;
              transition: width 2s ease;
            }
            .status {
              margin-bottom: 1rem;
              min-height: 24px;
            }
            button {
              background: #4caf50;
              color: white;
              border: none;
              padding: 0.5rem 1rem;
              border-radius: 4px;
              cursor: pointer;
              font-size: 1rem;
            }
            button:hover {
              background: #3e8e41;
            }
            button:disabled {
              background: #cccccc;
              cursor: not-allowed;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Admin Cache Cleaning</h1>
            <p>This will clean up service workers, caches, and offline data storage for all users.</p>
            
            <div class="progress">
              <div class="progress-bar" id="progress"></div>
            </div>
            
            <div class="status" id="status">Preparing to clear cache...</div>
            
            <button id="clearButton">Start Clearing Cache</button>
            <button id="returnButton" style="display: none;">Return to Application</button>
            
            <script>
              const progressBar = document.getElementById('progress');
              const statusEl = document.getElementById('status');
              const clearButton = document.getElementById('clearButton');
              const returnButton = document.getElementById('returnButton');
              
              async function clearCache() {
                clearButton.disabled = true;
                statusEl.textContent = 'Unregistering service workers...';
                progressBar.style.width = '20%';
                
                // Unregister service workers
                if ('serviceWorker' in navigator) {
                  try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                      await registration.unregister();
                    }
                    progressBar.style.width = '40%';
                    statusEl.textContent = 'Service workers unregistered.';
                  } catch (e) {
                    console.error('Error unregistering service workers', e);
                  }
                }
                
                // Clear caches
                statusEl.textContent = 'Clearing browser caches...';
                if ('caches' in window) {
                  try {
                    const cacheNames = await caches.keys();
                    await Promise.all(
                      cacheNames.map(name => caches.delete(name))
                    );
                    progressBar.style.width = '60%';
                    statusEl.textContent = 'Browser caches cleared.';
                  } catch (e) {
                    console.error('Error clearing caches', e);
                  }
                }
                
                // Clear IndexedDB
                statusEl.textContent = 'Clearing offline database...';
                try {
                  const dbNames = ['trackMadeEasEOfflineDB'];
                  for (const name of dbNames) {
                    const request = indexedDB.deleteDatabase(name);
                    await new Promise((resolve) => {
                      request.onsuccess = resolve;
                      request.onerror = resolve; // Still continue even if error
                    });
                  }
                  progressBar.style.width = '80%';
                  statusEl.textContent = 'Offline database cleared.';
                } catch (e) {
                  console.error('Error clearing IndexedDB', e);
                }
                
                // Clear localStorage
                localStorage.clear();
                progressBar.style.width = '100%';
                statusEl.textContent = 'All caches cleared! You can now return to the application.';
                
                // Show return button
                returnButton.style.display = 'inline-block';
              }
              
              clearButton.addEventListener('click', clearCache);
              
              returnButton.addEventListener('click', () => {
                window.location.href = '/?nocache=' + Date.now();
              });
            </script>
          </div>
        </body>
      </html>
    `;
    
    res.send(html);
  });

  // Trainer: Get specific client fitness plan
  app.get("/api/trainer/clients/:clientId/plans/:planId", ensureTrainer, async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;
      const clientId = parseInt(req.params.clientId);
      const planId = parseInt(req.params.planId);
      
      console.log(`Trainer ${trainerId} accessing fitness plan ${planId} for client ${clientId}`);
      
      // Get the trainer's clients to verify relationship
      const clients = await storage.getTrainerClients(trainerId);
      const clientRelationship = clients.find(c => c.client.id === clientId);
      
      if (!clientRelationship && !req.user!.isAdmin) {
        console.log(`Trainer ${trainerId} is not authorized to access client ${clientId}`);
        return res.status(403).json({ message: "This client is not assigned to you" });
      }
      
      // Get the fitness plan
      const plan = await storage.getFitnessPlan(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Fitness plan not found" });
      }
      
      // Make sure the plan belongs to the client
      if (plan.userId !== clientId) {
        console.log(`Plan ${planId} does not belong to client ${clientId}, it belongs to user ${plan.userId}`);
        return res.status(403).json({ message: "This fitness plan does not belong to the specified client" });
      }
      
      // Return the plan
      console.log(`Successfully returning plan ${planId} to trainer ${trainerId}`);
      res.json(plan);
    } catch (error) {
      console.error("Error fetching client fitness plan:", error);
      res.status(500).json({ message: "Failed to fetch client fitness plan" });
    }
  });
  
  // AI Coach chat endpoint - allows users to chat with their AI fitness coach
  app.post("/api/coach/chat", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = req.user!;
      const { message, quickMode, hasPlan } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }
      
      // Track if this is a quick chat without a plan, used for context in the AI response
      const isQuickMode = quickMode === true;
      
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ 
          message: "AI Coach is unavailable. Please contact the administrator." 
        });
      }
      
      // Check if fitness coach is globally disabled
      const globalDisableSetting = await storage.getSetting("fitness_coach_globally_disabled");
      const fitnessCoachGloballyDisabled = globalDisableSetting?.value === "true";
      
      if (fitnessCoachGloballyDisabled && !user.isAdmin && !user.isTrainer) {
        return res.status(403).json({
          message: "The AI Coach feature is currently disabled by the administrator."
        });
      }
      
      // Check if user has a trainer (regular users with trainers can't use AI coach)
      if (!user.isAdmin && !user.isTrainer) {
        const trainerAssignments = await storage.getClientTrainers(userId);
        if (trainerAssignments && trainerAssignments.length > 0) {
          return res.status(403).json({
            message: "You are assigned to a personal trainer. Please consult with your trainer for fitness guidance."
          });
        }
      }
      
      // Use AI coach function
      
      // Get a response from the AI coach
      const response = await chatWithAICoach(userId, user, message, { quickMode: isQuickMode });
      
      res.json({
        message: response.response,
        conversationId: response.conversationId
      });
    } catch (error) {
      console.error("Error chatting with AI coach:", error);
      res.status(500).json({ message: "Failed to communicate with AI Coach" });
    }
  });
  
  // Get AI Coach progress insights for dashboard
  app.get("/api/coach/insights", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = req.user!;
      
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ 
          message: "AI Coach insights are unavailable. Please contact the administrator." 
        });
      }
      
      // Use adaptive-coach functions
      
      // Get quick insights for the dashboard
      const progressUpdate = await getProgressUpdate(userId);
      
      // For detailed insights request
      let detailedInsights = null;
      if (req.query.detailed === 'true') {
        detailedInsights = await analyzeUserProgress(userId, user);
      }
      
      res.json({
        quickUpdate: progressUpdate,
        detailed: detailedInsights
      });
    } catch (error) {
      console.error("Error getting AI coach insights:", error);
      res.status(500).json({ message: "Failed to generate AI Coach insights" });
    }
  });

  /**
   * New comprehensive coach endpoint for generating fitness and nutrition plans
   * POST /api/coach
   * 
   * Takes user inputs including:
   * - Age, sex, height, weight, activity level
   * - Fitness goal (weight_loss, muscle_gain, strength, etc.)
   * - Dietary preferences
   * - Weekly food budget
   * - Optional location
   * 
   * Returns:
   * - Nutrition data (BMR, TDEE, calorie targets, macros)
   * - Weekly meal plan with ingredients
   * - Weekly workout plan
   * - Shopping list with estimated costs
   */
  app.post("/api/coach", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = req.user!;
      
      // Check for OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ 
          message: "AI Coach is unavailable. Please contact the administrator." 
        });
      }
      
      // Check if fitness coach is globally disabled
      const globalDisableSetting = await storage.getSetting("fitness_coach_globally_disabled");
      const fitnessCoachGloballyDisabled = globalDisableSetting?.value === "true";
      
      if (fitnessCoachGloballyDisabled && !user.isAdmin && !user.isTrainer) {
        return res.status(403).json({
          message: "The AI Coach feature is currently disabled by the administrator."
        });
      }
      
      // Check if this user is already generating a plan
      const planStatus = await storage.getPlanGenerationStatus(userId);
      if (planStatus && planStatus.isGenerating) {
        return res.status(429).json({
          message: "You already have a plan generation in progress. Please wait for it to complete before starting a new one.",
          status: "in_progress"
        });
      }
      
      // Mark that this user is starting plan generation
      await storage.setPlanGenerationStatus(userId, true);
      
      // Define and validate the input schema
      const coachInputSchema = z.object({
        age: z.number().int().min(13).max(100),
        sex: z.enum(['male', 'female']),
        height: z.number().min(100).max(250), // cm
        weight: z.number().min(30).max(250), // kg
        activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very_active', 'extra_active']),
        fitnessGoal: z.enum(['weight_loss', 'muscle_gain', 'strength', 'stamina', 'endurance']),
        dietaryPreferences: z.array(z.string()),
        weeklyBudget: z.number().min(10).max(500), // GBP
        location: z.string().optional(),
        // Add workout schedule preferences
        workoutDaysPerWeek: z.number().min(1).max(7).optional(),
        preferredWorkoutDays: z.array(z.string()).optional(),
        workoutDuration: z.number().min(15).max(180).optional(), // in minutes
        workoutNames: z.record(z.string()).optional(), // { day: name } format
        // Email notification preferences
        notifyByEmail: z.boolean().optional(),
        email: z.string().email().optional()
      });
      
      // Parse and validate input
      console.log("Received coach input:", req.body);
      const coachInput = coachInputSchema.parse(req.body);
      
      // Generate coach response with OpenAI
      const response = await generateCoachResponse(coachInput, user);
      
      // When we have a successful result, also update nutrition goals
      const { nutritionData, weeklyMealPlan, weeklyWorkoutPlan, shoppingList, suggestedStores } = response;
      await storage.setNutritionGoal(userId, {
        caloriesTarget: nutritionData.calorieTarget,
        proteinTarget: nutritionData.proteinTarget,
        carbsTarget: nutritionData.carbsTarget,
        fatTarget: nutritionData.fatTarget
      });
      
      // Save the fitness plan in the database
      try {
        console.log("Creating new fitness plan from coach response...");
        
        // Convert format needed for fitness plan
        const fitnessPlanData: InsertFitnessPlan = {
          userId,
          preferences: {
            goal: coachInput.fitnessGoal,
            currentWeight: coachInput.weight,
            unit: "kg",
            age: coachInput.age,
            height: coachInput.height, 
            gender: coachInput.sex,
            workoutDaysPerWeek: coachInput.workoutDaysPerWeek || Object.keys(weeklyWorkoutPlan).length,
            dietaryRestrictions: coachInput.dietaryPreferences,
            preferredFoods: [],
            fitnessLevel: coachInput.activityLevel === "sedentary" ? "beginner" : 
                          coachInput.activityLevel === "light" ? "beginner" : 
                          coachInput.activityLevel === "moderate" ? "intermediate" : "advanced",
            budget: coachInput.weeklyBudget,
            budgetType: "medium",
            // Add nutrition data inside preferences for access in UI
            nutritionData: {
              bmr: nutritionData.bmr,
              tdee: nutritionData.tdee,
              dailyCalories: nutritionData.calorieTarget,
              targetProtein: nutritionData.proteinTarget,
              targetCarbs: nutritionData.carbsTarget,
              targetFat: nutritionData.fatTarget,
              proteinPercent: Math.round((nutritionData.proteinTarget * 4 / nutritionData.calorieTarget) * 100),
              carbsPercent: Math.round((nutritionData.carbsTarget * 4 / nutritionData.calorieTarget) * 100),
              fatPercent: Math.round((nutritionData.fatTarget * 9 / nutritionData.calorieTarget) * 100)
            },
            // Add shopping list and suggested stores to preferences as well
            shoppingList: shoppingList,
            suggestedStores: suggestedStores,
            // Add workout schedule preferences
            preferredWorkoutDays: coachInput.preferredWorkoutDays || [],
            workoutDuration: coachInput.workoutDuration || 60,
            workoutNames: coachInput.workoutNames || {}
          },
          workoutPlan: {
            weeklySchedule: weeklyWorkoutPlan,
            notes: "Generated by AI Coach using enhanced features"
          },
          mealPlan: {
            weeklyMeals: weeklyMealPlan,
            notes: "Nutrition plan optimized based on your BMR and TDEE"
          },
          isActive: true,
          createdAt: new Date()
        };
        
        // Deactivate any existing active plans
        await db.update(fitnessPlans)
          .set({ isActive: false })
          .where(and(eq(fitnessPlans.userId, userId), eq(fitnessPlans.isActive, true)))
          .execute();
          
        // Save the new plan
        const [newPlan] = await db.insert(fitnessPlans)
          .values(fitnessPlanData)
          .returning();
          
        console.log(`New fitness plan created with ID: ${newPlan.id}`);
        
        // Send email notification if user opted in
        if (coachInput.notifyByEmail && coachInput.email) {
          try {
            // Check if email credentials are configured before attempting to send
            if (!hasEmailCredentials()) {
              console.warn(`Email notification requested but no email credentials are configured. Skipping email to ${coachInput.email}`);
            } else {
              console.log(`Sending plan ready email to ${coachInput.email}`);
              const emailSent = await sendPlanReadyEmail(
                user,
                coachInput.email,
                newPlan.id,
                shoppingList
              );
              
              if (emailSent) {
                console.log(`Successfully sent plan ready email to ${coachInput.email}`);
              } else {
                console.error(`Failed to send plan ready email to ${coachInput.email}`);
              }
            }
          } catch (emailError) {
            console.error("Error sending plan ready email:", emailError);
            // Continue even if email sending fails
          }
        }
      } catch (planError) {
        console.error("Error creating fitness plan:", planError);
        // Continue even if plan creation fails - we'll still return the response
      }
      
      // Clear the plan generation status for this user
      await storage.clearPlanGenerationStatus(userId);
      
      // Return the comprehensive response
      res.status(200).json(response);
    } catch (error) {
      console.error("Error in coach endpoint:", error);
      
      // Clear the plan generation status for this user on error
      try {
        if (req.user && req.user.id) {
          await storage.clearPlanGenerationStatus(req.user.id);
        }
      } catch (statusError) {
        console.error("Error clearing plan generation status:", statusError);
      }
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid input data", 
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to generate fitness and nutrition plan",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  return httpServer;
}
