import { 
  users, type User, type InsertUser,
  meals, type Meal, type InsertMeal,
  workouts, type Workout, type InsertWorkout,
  exercises, type Exercise, type InsertExercise,
  weights, type Weight, type InsertWeight,
  nutritionGoals, type NutritionGoal, type InsertNutritionGoal,
  fitnessPlans, type FitnessPlan, type InsertFitnessPlan,
  systemSettings, type SystemSetting, type InsertSystemSetting,
  goals, type Goal, type InsertGoal,
  exerciseLibrary, type ExerciseLibrary, type InsertExerciseLibrary,
  savedMeals, type SavedMeal, type InsertSavedMeal,
  trainerClients, type TrainerClient, type InsertTrainerClient,
  trainerClientRequests, type TrainerClientRequest, type InsertTrainerClientRequest,
  trainerMessages, type TrainerMessage, type InsertTrainerMessage,
  trainerNutritionPlans, type TrainerNutritionPlan, type InsertTrainerNutritionPlan,
  trainerFitnessPlans, type TrainerFitnessPlan, type InsertTrainerFitnessPlan,
  passwordResetTokens, type PasswordResetToken, type InsertPasswordResetToken,
  planGenerationStatus, type PlanGenerationStatus, type InsertPlanGenerationStatus,
  type SetData,
  type AIAnalysis
} from "@shared/schema";

// Partial user type for public exposure (excludes sensitive data)
type PartialUser = {
  id: number;
  username: string;
  email: string;
  isAdmin?: boolean;
  isTrainer?: boolean;
  isApproved?: boolean;
};
import { db } from "./db";
import { eq, desc, and, gte, lte, asc, or, like, sql, inArray, not } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Import types from stepwise-coach for plan generation
import { GenerationStatus as StepwisePlanStatus } from "./stepwise-coach";
import { CoachInput } from "./coach";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  searchUsers(query: string): Promise<User[]>;
  searchUsersByUsername(query: string): Promise<User[]>;
  approveUser(id: number): Promise<User | undefined>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  getUserProfile(id: number): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  updateUserProfile(id: number, profileUpdate: {
    email?: string;
    dateOfBirth?: Date | null;
    gender?: string | null;
    height?: number | null;
    weight?: number | null;
    heightUnit?: string;
    weightUnit?: string;
    fitnessGoal?: string | null;
    bodyType?: string | null;
    aiAnalysis?: string | null; // JSON string containing the AI analysis
    hasCompletedOnboarding?: boolean;
    hasAcknowledgedAnalysis?: boolean;
    // Add any other fields needed for onboarding
  }): Promise<User | undefined>;
  
  // Onboarding Analysis
  saveOnboardingAnalysis(userId: number, analysis: AIAnalysis): Promise<boolean>;
  getOnboardingAnalysis(userId: number): Promise<AIAnalysis | null>;
  
  // Meal management
  getMeals(userId: number): Promise<Meal[]>;
  getMealsByDate(userId: number, date: Date): Promise<Meal[]>;
  getMeal(id: number): Promise<Meal | undefined>;
  createMeal(userId: number, meal: InsertMeal): Promise<Meal>;
  updateMeal(id: number, meal: Partial<InsertMeal>): Promise<Meal | undefined>;
  deleteMeal(id: number): Promise<boolean>;
  getMealLogs(userId: number): Promise<Meal[]>; // Alias for getMeals
  deletePlannedMealsForUser(userId: number): Promise<boolean>; // Delete all planned meals for a user
  
  // Workout management
  getWorkouts(userId: number): Promise<Workout[]>;
  getWorkout(id: number): Promise<Workout | undefined>;
  createWorkout(userId: number, workout: InsertWorkout): Promise<Workout>;
  updateWorkout(id: number, workout: Partial<InsertWorkout>): Promise<Workout | undefined>;
  deleteWorkout(id: number): Promise<boolean>;
  deleteFutureWorkoutsForUser(userId: number, fromDate: Date): Promise<boolean>; // Delete future workouts for a user
  
  // Exercise management
  getExercisesByWorkout(workoutId: number): Promise<Exercise[]>;
  getExercise(id: number): Promise<Exercise | undefined>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  updateExercise(id: number, exercise: Partial<InsertExercise>): Promise<Exercise | undefined>;
  deleteExercise(id: number): Promise<boolean>;
  
  // Weight tracking
  getWeights(userId: number): Promise<Weight[]>;
  getWeight(id: number): Promise<Weight | undefined>;
  getLatestWeight(userId: number): Promise<Weight | undefined>;
  createWeight(weightData: { userId: number; weight: number; unit?: string; date?: Date }): Promise<Weight>;
  deleteWeight(id: number): Promise<boolean>;
  
  // Nutrition goals
  getNutritionGoal(userId: number): Promise<NutritionGoal | undefined>;
  setNutritionGoal(userId: number, goal: InsertNutritionGoal): Promise<NutritionGoal>;
  
  // Goals
  getGoals(userId: number): Promise<Goal[]>;
  getGoal(id: number): Promise<Goal | undefined>;
  createGoal(userId: number, goal: InsertGoal): Promise<Goal>;
  updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: number): Promise<boolean>;
  
  // Fitness plans
  getFitnessPlans(userId: number): Promise<FitnessPlan[]>;
  getAllFitnessPlans(): Promise<FitnessPlan[]>;
  getFitnessPlan(id: number): Promise<FitnessPlan | undefined>;
  getActiveFitnessPlan(userId: number): Promise<FitnessPlan | undefined>;
  createFitnessPlan(userId: number, plan: InsertFitnessPlan): Promise<FitnessPlan>;
  updateFitnessPlan(id: number, plan: Partial<InsertFitnessPlan>): Promise<FitnessPlan | undefined>;
  deactivateFitnessPlan(id: number): Promise<boolean>;
  deleteFitnessPlan(id: number): Promise<boolean>;
  getTrainerPlans(trainerId: number): Promise<FitnessPlan[]>;
  
  // System settings
  getSetting(key: string): Promise<SystemSetting | undefined>;
  setSetting(key: string, value: string, description?: string): Promise<SystemSetting>;
  getSettings(): Promise<SystemSetting[]>;
  
  // Exercise Library
  getExerciseLibrary(): Promise<ExerciseLibrary[]>;
  getExerciseLibraryByMuscleGroup(muscleGroup: string): Promise<ExerciseLibrary[]>;
  getExerciseLibraryById(id: number): Promise<ExerciseLibrary | undefined>;
  createExerciseLibraryEntry(exercise: InsertExerciseLibrary): Promise<ExerciseLibrary>;
  updateExerciseLibraryEntry(id: number, exercise: Partial<InsertExerciseLibrary>): Promise<ExerciseLibrary | undefined>;
  deleteExerciseLibraryEntry(id: number): Promise<boolean>;
  
  // Saved Meals (Personal Meal Library)
  getSavedMeals(userId: number): Promise<SavedMeal[]>;
  getSavedMealsByType(userId: number, mealType: string): Promise<SavedMeal[]>;
  getSavedMeal(id: number): Promise<SavedMeal | undefined>;
  createSavedMeal(userId: number, meal: InsertSavedMeal): Promise<SavedMeal>;
  updateSavedMeal(id: number, meal: Partial<InsertSavedMeal>): Promise<SavedMeal | undefined>;
  deleteSavedMeal(id: number): Promise<boolean>;
  
  // Trainer-Client Management
  getTrainers(): Promise<User[]>;
  makeUserTrainer(userId: number): Promise<User | undefined>;
  removeTrainerStatus(userId: number): Promise<User | undefined>;
  getTrainerClients(trainerId: number): Promise<{ client: User, relationship: TrainerClient }[]>;
  getClientTrainers(clientId: number): Promise<{ trainer: User, relationship: TrainerClient }[]>;
  assignClientToTrainer(trainerId: number, clientId: number, notes?: string): Promise<TrainerClient>;
  removeClientFromTrainer(trainerId: number, clientId: number): Promise<boolean>;
  updateTrainerClientNotes(id: number, notes: string): Promise<TrainerClient | undefined>;
  removeTrainerClient(relationshipId: number): Promise<boolean>;
  userHasTrainers(userId: number): Promise<boolean>;
  
  // Trainer-Client Request Management
  createTrainerClientRequest(request: InsertTrainerClientRequest): Promise<TrainerClientRequest>;
  getTrainerClientRequests(trainerId: number): Promise<(TrainerClientRequest & { client?: PartialUser })[]>;
  getClientTrainerRequests(clientId: number): Promise<(TrainerClientRequest & { trainer?: PartialUser })[]>;
  getTrainerClientRequestById(id: number): Promise<TrainerClientRequest | undefined>;
  respondToTrainerClientRequest(id: number, status: string): Promise<TrainerClientRequest | undefined>;
  deleteTrainerClientRequest(id: number): Promise<boolean>;
  
  // Trainer-Client Messaging
  createTrainerMessage(message: InsertTrainerMessage): Promise<TrainerMessage>;
  getTrainerClientMessages(trainerId: number, clientId: number): Promise<TrainerMessage[]>;
  getUnreadMessagesCount(userId: number): Promise<number>;
  markMessagesAsRead(userId: number, messageIds: number[]): Promise<boolean>;
  
  // Trainer Nutrition Plans
  getTrainerNutritionPlans(trainerId: number): Promise<TrainerNutritionPlan[]>;
  getClientNutritionPlans(clientId: number): Promise<(TrainerNutritionPlan & { trainer?: PartialUser })[]>;
  getTrainerNutritionPlan(id: number): Promise<TrainerNutritionPlan | undefined>;
  createTrainerNutritionPlan(plan: InsertTrainerNutritionPlan): Promise<TrainerNutritionPlan>;
  updateTrainerNutritionPlan(id: number, plan: Partial<InsertTrainerNutritionPlan>): Promise<TrainerNutritionPlan | undefined>;
  deleteTrainerNutritionPlan(id: number): Promise<boolean>;
  
  // Trainer Fitness Plans
  getTrainerFitnessPlans(trainerId: number): Promise<TrainerFitnessPlan[]>;
  getClientFitnessPlans(clientId: number): Promise<(TrainerFitnessPlan & { trainer?: PartialUser })[]>;
  getTrainerFitnessPlan(id: number): Promise<TrainerFitnessPlan | undefined>;
  createTrainerFitnessPlan(plan: InsertTrainerFitnessPlan): Promise<TrainerFitnessPlan>;
  updateTrainerFitnessPlan(id: number, plan: Partial<InsertTrainerFitnessPlan>): Promise<TrainerFitnessPlan | undefined>;
  deleteTrainerFitnessPlan(id: number): Promise<boolean>;
  
  // Password Reset
  createPasswordResetToken(userId: number, token: string, expiryHours?: number): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  invalidatePasswordResetToken(token: string): Promise<boolean>;
  
  // Plan Generation Status
  getPlanGenerationStatus(userId: number): Promise<PlanGenerationStatus | undefined>;
  setPlanGenerationStatus(userId: number, isGenerating: boolean, progressData?: Partial<PlanGenerationStatus>): Promise<PlanGenerationStatus>;
  clearPlanGenerationStatus(userId: number): Promise<boolean>;
  
  // Plan Data Management
  storePlanGenerationData(userId: number, data: import('./stepwise-coach').PlanData): Promise<boolean>;
  getPlanGenerationData(userId: number): Promise<import('./stepwise-coach').PlanData | undefined>;
  storeInputData(userId: number, input: import('./coach').CoachInput | import('../client/src/types/plan-generation').PlanInput): Promise<boolean>;
  getInputData(userId: number): Promise<import('./coach').CoachInput | import('../client/src/types/plan-generation').PlanInput | undefined>;
  
  // Session store for authentication
  sessionStore: any; // Using any type to avoid type errors with express-session
}

const PostgresSessionStore = connectPg(session);

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using any type to avoid type errors with express-session
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }
  
  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Use case-insensitive matching by converting to lowercase
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER(${username})`);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Use case-insensitive matching by converting to lowercase
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.email}) = LOWER(${email})`);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.registered_at));
  }
  
  async searchUsers(query: string): Promise<User[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    return await db
      .select()
      .from(users)
      .where(
        or(
          like(sql`LOWER(${users.username})`, searchTerm),
          like(sql`LOWER(${users.email})`, searchTerm)
        )
      )
      .orderBy(desc(users.registered_at));
  }
  
  async searchUsersByUsername(query: string): Promise<User[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    return await db
      .select()
      .from(users)
      .where(like(sql`LOWER(${users.username})`, searchTerm))
      .orderBy(asc(users.username))
      .limit(10); // Limit results to prevent overflow
  }
  
  // Check if a user has any trainers assigned to them
  async userHasTrainers(userId: number): Promise<boolean> {
    const trainerRelationships = await db
      .select()
      .from(trainerClients)
      .where(eq(trainerClients.clientId, userId));
    
    return trainerRelationships.length > 0;
  }
  
  async approveUser(id: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ isApproved: true })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  async updateUser(id: number, userUpdate: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userUpdate)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  async getUserProfile(id: number): Promise<User | undefined> {
    // This method gets the full user profile including onboarding data
    return await this.getUser(id);
  }
  
  async updateUserProfile(id: number, profileUpdate: {
    email?: string;
    dateOfBirth?: Date | null;
    gender?: string | null;
    height?: number | null;
    weight?: number | null;
    heightUnit?: string;
    weightUnit?: string;
    fitnessGoal?: string | null;
    bodyType?: string | null;
    aiAnalysis?: string | null; // JSON string containing the AI analysis
    hasCompletedOnboarding?: boolean;
    hasAcknowledgedAnalysis?: boolean;
    // Add any other fields needed for onboarding
  }): Promise<User | undefined> {
    console.log(`[DATABASE:PROFILE:1] Updating user profile for user ${id}`);
    console.log(`[DATABASE:PROFILE:2] Profile update data:`, JSON.stringify(profileUpdate));
    
    try {
      const [updatedUser] = await db
        .update(users)
        .set(profileUpdate)
        .where(eq(users.id, id))
        .returning();
      
      console.log(`[DATABASE:PROFILE:3] Profile update success:`, 
        updatedUser ? 'Yes' : 'No');
      
      if (updatedUser) {
        console.log(`[DATABASE:PROFILE:4] Updated user profile:`, JSON.stringify({
          id: updatedUser.id,
          username: updatedUser.username,
          fitnessGoal: updatedUser.fitnessGoal,
          bodyType: updatedUser.bodyType,
          height: updatedUser.height,
          weight: updatedUser.weight,
          heightUnit: updatedUser.heightUnit,
          weightUnit: updatedUser.weightUnit,
          gender: updatedUser.gender,
          hasCompletedOnboarding: updatedUser.hasCompletedOnboarding
        }));
      } else {
        console.error(`[DATABASE:PROFILE:4] Failed to update profile for user ${id}`);
      }
      
      return updatedUser;
    } catch (error) {
      console.error(`[DATABASE:PROFILE:X] Error updating profile for user ${id}:`, error);
      return undefined;
    }
  }
  
  // Meal management
  async getMeals(userId: number): Promise<Meal[]> {
    return await db.select().from(meals).where(eq(meals.userId, userId));
  }

  async getMealsByDate(userId: number, date: Date): Promise<Meal[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db.select().from(meals).where(
      and(
        eq(meals.userId, userId),
        gte(meals.date, startOfDay),
        lte(meals.date, endOfDay)
      )
    );
  }

  async getMeal(id: number): Promise<Meal | undefined> {
    const [meal] = await db.select().from(meals).where(eq(meals.id, id));
    return meal;
  }

  async createMeal(userId: number, insertMeal: InsertMeal): Promise<Meal> {
    const [meal] = await db.insert(meals).values({
      ...insertMeal,
      userId,
    }).returning();
    return meal;
  }

  async updateMeal(id: number, mealUpdate: Partial<InsertMeal>): Promise<Meal | undefined> {
    const [updatedMeal] = await db
      .update(meals)
      .set(mealUpdate)
      .where(eq(meals.id, id))
      .returning();
    return updatedMeal;
  }

  async deleteMeal(id: number): Promise<boolean> {
    const result = await db.delete(meals).where(eq(meals.id, id)).returning({ id: meals.id });
    return result.length > 0;
  }
  
  // Alias for getMeals for use in AI Coach
  async getMealLogs(userId: number): Promise<Meal[]> {
    return this.getMeals(userId);
  }
  
  // Delete all planned meals for a user
  async deletePlannedMealsForUser(userId: number): Promise<boolean> {
    try {
      console.log(`Deleting all planned meals for user ${userId}`);
      // Only delete meals that are marked as planned (not consumed)
      const result = await db
        .delete(meals)
        .where(
          and(
            eq(meals.userId, userId),
            eq(meals.isPlanned, true)
          )
        );
      console.log(`Successfully deleted planned meals for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting planned meals for user ${userId}:`, error);
      return false;
    }
  }
  
  // Workout management
  async getWorkouts(userId: number): Promise<Workout[]> {
    return await db
      .select()
      .from(workouts)
      .where(eq(workouts.userId, userId))
      .orderBy(desc(workouts.date));
  }
  
  // Delete future workouts for a user
  async deleteFutureWorkoutsForUser(userId: number, fromDate: Date): Promise<boolean> {
    try {
      console.log(`Deleting future workouts for user ${userId} from date ${fromDate.toISOString()}`);
      
      // Get IDs of all workouts to delete
      const workoutsToDelete = await db
        .select({ id: workouts.id })
        .from(workouts)
        .where(
          and(
            eq(workouts.userId, userId),
            gte(workouts.date, fromDate)
          )
        );
      
      const workoutIds = workoutsToDelete.map(w => w.id);
      
      if (workoutIds.length === 0) {
        console.log(`No future workouts found for user ${userId}`);
        return true;
      }
      
      // Delete all exercises associated with these workouts
      await db
        .delete(exercises)
        .where(inArray(exercises.workoutId, workoutIds));
      
      // Delete the workouts
      await db
        .delete(workouts)
        .where(inArray(workouts.id, workoutIds));
      
      console.log(`Successfully deleted ${workoutIds.length} future workouts for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting future workouts for user ${userId}:`, error);
      return false;
    }
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    return workout;
  }

  async createWorkout(userId: number, insertWorkout: InsertWorkout): Promise<Workout> {
    const [workout] = await db.insert(workouts).values({
      ...insertWorkout,
      userId,
    }).returning();
    return workout;
  }

  async updateWorkout(id: number, workoutUpdate: Partial<InsertWorkout>): Promise<Workout | undefined> {
    const [updatedWorkout] = await db
      .update(workouts)
      .set(workoutUpdate)
      .where(eq(workouts.id, id))
      .returning();
    return updatedWorkout;
  }

  async deleteWorkout(id: number): Promise<boolean> {
    // Exercises will be deleted automatically due to CASCADE constraint
    const result = await db.delete(workouts).where(eq(workouts.id, id)).returning({ id: workouts.id });
    return result.length > 0;
  }
  
  // Exercise management
  async getExercisesByWorkout(workoutId: number): Promise<Exercise[]> {
    try {
      // Use a simpler approach with Drizzle ORM
      const result = await db
        .select({
          id: exercises.id,
          workoutId: exercises.workoutId,
          name: exercises.name,
          sets: exercises.sets,
          reps: exercises.reps,
          weight: exercises.weight,
          unit: exercises.unit,
          rest: exercises.rest
        })
        .from(exercises)
        .where(eq(exercises.workoutId, workoutId));
      
      // Return empty array if no results
      if (result.length === 0) {
        return [];
      }
      
      // Add missing properties and return a properly typed result
      const typedResults: Exercise[] = result.map(exercise => {
        // Initialize setsData based on sets, reps, and weight for every exercise
        const defaultSetsData: SetData[] = Array.from({ length: exercise.sets }, () => ({
          reps: exercise.reps,
          weight: exercise.weight || 0,
          completed: false
        }));
        
        return {
          ...exercise,
          rest: exercise.rest || null,
          notes: null, // Default value for compatibility
          setsData: defaultSetsData
        };
      }) as Exercise[];
      
      return typedResults;
    } catch (error) {
      console.error("Error in getExercisesByWorkout:", error);
      
      // Return empty array for compatibility
      return [];
    }
  }
  
  async getExercise(id: number): Promise<Exercise | undefined> {
    try {
      const [exercise] = await db
        .select()
        .from(exercises)
        .where(eq(exercises.id, id));
      return exercise;
    } catch (error) {
      console.error("Error in getExercise:", error);
      return undefined;
    }
  }

  async createExercise(insertExercise: InsertExercise): Promise<Exercise> {
    // Handle setsData separately since we don't store it in the database
    const setsData = insertExercise.setsData;
    
    // Create a clean insert object without setsData
    const cleanInsertExercise = { ...insertExercise };
    // Remove setsData property from the clone
    if ('setsData' in cleanInsertExercise) {
      delete cleanInsertExercise.setsData;
    }
    
    // If no reps or weight are provided but setsData is, use values from the first set
    if (setsData && Array.isArray(setsData) && setsData.length > 0) {
      if (!cleanInsertExercise.reps && setsData[0].reps) {
        cleanInsertExercise.reps = setsData[0].reps;
      }
      
      if (!cleanInsertExercise.weight && setsData[0].weight) {
        cleanInsertExercise.weight = setsData[0].weight;
      }
    }
    
    // If unit isn't specified, default to kg
    if (!cleanInsertExercise.unit) {
      cleanInsertExercise.unit = 'kg';
    }
    
    // Perform the database insert without setsData field
    const [exercise] = await db.insert(exercises).values(cleanInsertExercise).returning();
    
    // Re-add setsData to the returned object
    if (exercise && setsData) {
      // Create a copy to avoid modifying the result directly and add setsData property
      const exerciseWithSetsData = { 
        ...exercise,
        setsData: [] as SetData[] // Initialize with a properly typed empty array
      };
      
      // If setsData length doesn't match sets, resize it
      if (Array.isArray(setsData) && setsData.length !== exercise.sets) {
        const resizedSetsData: SetData[] = Array.from({ length: exercise.sets }, (_, index) => {
          if (index < setsData.length) {
            return setsData[index];
          } else {
            return {
              reps: exercise.reps,
              weight: exercise.weight || 0,
              completed: false
            };
          }
        });
        
        exerciseWithSetsData.setsData = resizedSetsData;
      } else {
        exerciseWithSetsData.setsData = Array.isArray(setsData) ? setsData : [];
      }
      
      return exerciseWithSetsData;
    }
    
    // If no setsData was provided, generate default setsData
    const defaultSetsData: SetData[] = Array.from({ length: exercise.sets }, () => ({
      reps: exercise.reps,
      weight: exercise.weight || 0,
      completed: false
    }));
    
    return {
      ...exercise,
      setsData: defaultSetsData
    };
  }

  async updateExercise(id: number, exerciseUpdate: Partial<InsertExercise>): Promise<Exercise | undefined> {
    // Handle setsData separately since we don't store it in the database
    const setsData = exerciseUpdate.setsData;
    
    // Create a clean update object without setsData
    const cleanExerciseUpdate = { ...exerciseUpdate };
    // Remove setsData property from the clone
    if ('setsData' in cleanExerciseUpdate) {
      delete cleanExerciseUpdate.setsData;
    }
    
    // Calculate new reps and weight if setsData is provided
    if (setsData && Array.isArray(setsData) && setsData.length > 0) {
      // Calculate the new reps and weight based on the first set
      // (We can only store a single value in the database)
      cleanExerciseUpdate.reps = setsData[0].reps;
      cleanExerciseUpdate.weight = setsData[0].weight;
      
      // Update sets count if needed
      if (!cleanExerciseUpdate.sets) {
        cleanExerciseUpdate.sets = setsData.length;
      }
    }
    
    // Perform the actual database update
    const [updatedExercise] = await db
      .update(exercises)
      .set(cleanExerciseUpdate)
      .where(eq(exercises.id, id))
      .returning();
    
    // Re-add setsData to the returned object
    if (updatedExercise && setsData) {
      // Make a copy to avoid modifying the database result directly
      const exerciseWithSetsData = { 
        ...updatedExercise,
        setsData: [] as SetData[] // Initialize with properly typed empty array
      };
      
      // Set up expected number of sets
      const sets = updatedExercise.sets;
      
      // Ensure setsData array matches the number of sets
      if (Array.isArray(setsData) && setsData.length !== sets) {
        const resizedSetsData: SetData[] = Array.from({ length: sets }, (_, index) => {
          // Use existing data if available, otherwise create default
          if (index < setsData.length) {
            return setsData[index];
          } else {
            return {
              reps: updatedExercise.reps,
              weight: updatedExercise.weight || 0,
              completed: false
            };
          }
        });
        
        exerciseWithSetsData.setsData = resizedSetsData;
      } else {
        exerciseWithSetsData.setsData = Array.isArray(setsData) ? setsData : [];
      }
      
      return exerciseWithSetsData;
    }
    
    return updatedExercise;
  }

  async deleteExercise(id: number): Promise<boolean> {
    const result = await db.delete(exercises).where(eq(exercises.id, id)).returning({ id: exercises.id });
    return result.length > 0;
  }
  
  // Weight tracking
  async getWeights(userId: number): Promise<Weight[]> {
    return await db
      .select()
      .from(weights)
      .where(eq(weights.userId, userId))
      .orderBy(desc(weights.date));
  }

  async getWeight(id: number): Promise<Weight | undefined> {
    const [weight] = await db
      .select()
      .from(weights)
      .where(eq(weights.id, id));
    return weight;
  }

  async getLatestWeight(userId: number): Promise<Weight | undefined> {
    const [latestWeight] = await db
      .select()
      .from(weights)
      .where(eq(weights.userId, userId))
      .orderBy(desc(weights.date))
      .limit(1);
    return latestWeight;
  }

  async createWeight(weightData: { userId: number; weight: number; unit?: string; date?: Date }): Promise<Weight> {
    const { userId, weight: weightValue, unit = 'kg', date = new Date() } = weightData;
    
    const [weight] = await db.insert(weights).values({
      userId,
      weight: weightValue,
      unit,
      date
    }).returning();
    
    return weight;
  }
  
  async deleteWeight(id: number): Promise<boolean> {
    const result = await db
      .delete(weights)
      .where(eq(weights.id, id))
      .returning({ id: weights.id });
    return result.length > 0;
  }
  
  // Nutrition goals
  async getNutritionGoal(userId: number): Promise<NutritionGoal | undefined> {
    const [goal] = await db.select().from(nutritionGoals).where(eq(nutritionGoals.userId, userId));
    return goal;
  }

  async setNutritionGoal(userId: number, insertGoal: InsertNutritionGoal): Promise<NutritionGoal> {
    // Check if a goal already exists for this user
    const existingGoal = await this.getNutritionGoal(userId);
    
    if (existingGoal) {
      // Update existing goal
      const [updatedGoal] = await db
        .update(nutritionGoals)
        .set(insertGoal)
        .where(eq(nutritionGoals.id, existingGoal.id))
        .returning();
      return updatedGoal;
    } else {
      // Create new goal
      const [goal] = await db.insert(nutritionGoals).values({
        ...insertGoal,
        userId,
      }).returning();
      return goal;
    }
  }
  
  // Fitness plans
  async getFitnessPlans(userId: number): Promise<FitnessPlan[]> {
    return await db
      .select()
      .from(fitnessPlans)
      .where(eq(fitnessPlans.userId, userId))
      .orderBy(desc(fitnessPlans.createdAt));
  }
  
  async getAllFitnessPlans(): Promise<FitnessPlan[]> {
    return await db
      .select()
      .from(fitnessPlans)
      .orderBy(desc(fitnessPlans.createdAt));
  }
  
  async getFitnessPlan(id: number): Promise<FitnessPlan | undefined> {
    const [plan] = await db
      .select()
      .from(fitnessPlans)
      .where(eq(fitnessPlans.id, id));
    return plan;
  }
  
  async getActiveFitnessPlan(userId: number): Promise<FitnessPlan | undefined> {
    console.log(`Getting active fitness plan for user ${userId}`);
    try {
      const [plan] = await db
        .select()
        .from(fitnessPlans)
        .where(
          and(
            eq(fitnessPlans.userId, userId),
            eq(fitnessPlans.isActive, true)
          )
        )
        .orderBy(desc(fitnessPlans.createdAt))
        .limit(1);
      
      if (plan) {
        console.log(`Found active fitness plan ${plan.id} for user ${userId}`);
      } else {
        console.log(`No active fitness plan found for user ${userId}`);
      }
      
      return plan;
    } catch (error) {
      console.error(`Error getting active fitness plan for user ${userId}:`, error);
      return undefined;
    }
  }
  
  async createFitnessPlan(userId: number, plan: InsertFitnessPlan): Promise<FitnessPlan> {
    // Debug log to see what's coming in
    console.log("DEBUG - Creating fitness plan for user:", userId);
    console.log("DEBUG - Plan preferences:", plan.preferences);
    console.log("DEBUG - Fitness goal from preferences:", plan.preferences.goal);
    
    // First, deactivate any active plans
    await db
      .update(fitnessPlans)
      .set({ isActive: false })
      .where(
        and(
          eq(fitnessPlans.userId, userId),
          eq(fitnessPlans.isActive, true)
        )
      );
    
    // Then create the new plan (it will be active by default)
    const [newPlan] = await db
      .insert(fitnessPlans)
      .values({
        ...plan,
        userId,
        isActive: true
      })
      .returning();
    
    // Debug log the created plan
    console.log("DEBUG - Created new fitness plan:", newPlan.id);
    console.log("DEBUG - New plan preferences:", newPlan.preferences);
    
    return newPlan;
  }
  
  async updateFitnessPlan(id: number, plan: Partial<InsertFitnessPlan>): Promise<FitnessPlan | undefined> {
    const [updatedPlan] = await db
      .update(fitnessPlans)
      .set(plan)
      .where(eq(fitnessPlans.id, id))
      .returning();
    
    return updatedPlan;
  }
  
  async updateFitnessPlanNotes(id: number, workoutNotes?: string, mealNotes?: string): Promise<FitnessPlan | undefined> {
    // Get current plan
    const [currentPlan] = await db
      .select()
      .from(fitnessPlans)
      .where(eq(fitnessPlans.id, id));
      
    if (!currentPlan) return undefined;
    
    // Prepare the update data
    const updateData: any = {};
    
    // Only update the parts that were provided
    if (workoutNotes !== undefined) {
      // Need to update the workoutPlan object while preserving other fields
      const workoutPlan = currentPlan.workoutPlan || {};
      if (typeof workoutPlan === 'object') {
        updateData.workoutPlan = { 
          ...Object.fromEntries(Object.entries(workoutPlan)),
          notes: workoutNotes 
        };
      } else {
        // Handle case where workoutPlan is not an object
        updateData.workoutPlan = { notes: workoutNotes };
      }
    }
    
    if (mealNotes !== undefined) {
      // Need to update the mealPlan object while preserving other fields
      const mealPlan = currentPlan.mealPlan || {};
      if (typeof mealPlan === 'object') {
        updateData.mealPlan = { 
          ...Object.fromEntries(Object.entries(mealPlan)),
          notes: mealNotes 
        };
      } else {
        // Handle case where mealPlan is not an object
        updateData.mealPlan = { notes: mealNotes };
      }
    }
    
    // If nothing to update, return current plan
    if (Object.keys(updateData).length === 0) {
      return currentPlan;
    }
    
    // Update and return
    const [updatedPlan] = await db
      .update(fitnessPlans)
      .set(updateData)
      .where(eq(fitnessPlans.id, id))
      .returning();
      
    return updatedPlan;
  }
  
  // Method has been implemented below with more robust handling
  
  async deactivateFitnessPlan(id: number): Promise<boolean> {
    try {
      // First, get the plan to find the user ID
      const [plan] = await db
        .select()
        .from(fitnessPlans)
        .where(eq(fitnessPlans.id, id));
        
      if (!plan) {
        console.error(`Plan with ID ${id} not found for deactivation`);
        return false;
      }
      
      const userId = plan.userId;
      
      // 1. Deactivate the fitness plan
      const result = await db
        .update(fitnessPlans)
        .set({ 
          isActive: false,
          deactivatedAt: new Date()
        })
        .where(eq(fitnessPlans.id, id))
        .returning({ id: fitnessPlans.id });
      
      if (result.length === 0) {
        return false;
      }
      
      console.log(`Successfully deactivated fitness plan ${id} for user ${userId}`);
      
      // 2. Clean up all workout data associated with this plan
      try {
        // Get all workouts associated with this user
        const userWorkouts = await db
          .select()
          .from(workouts)
          .where(eq(workouts.userId, userId));
          
        // Delete workout data (exercises) for this user's workouts
        for (const workout of userWorkouts) {
          await db
            .delete(exercises)
            .where(eq(exercises.workoutId, workout.id));
            
          console.log(`Deleted exercises for workout ${workout.id}`);
        }
        
        // Delete the workouts themselves
        await db
          .delete(workouts)
          .where(eq(workouts.userId, userId));
          
        console.log(`Deleted all workouts for user ${userId}`);
      } catch (error) {
        console.error(`Error cleaning up workout data for plan ${id}:`, error);
        // Continue anyway, this isn't critical for deactivation
      }
      
      // 3. Clear plan generation status
      try {
        await this.clearPlanGenerationStatus(userId);
        console.log(`Cleared plan generation status for user ${userId}`);
      } catch (error) {
        console.error(`Error clearing plan generation status for user ${userId}:`, error);
        // Continue anyway
      }
      
      return true;
    } catch (error) {
      console.error(`Error during plan deactivation for plan ${id}:`, error);
      return false;
    }
  }
  
  async deleteFitnessPlan(id: number): Promise<boolean> {
    try {
      // First, get the plan to find the user ID
      const [plan] = await db
        .select()
        .from(fitnessPlans)
        .where(eq(fitnessPlans.id, id));
        
      if (!plan) {
        console.error(`Plan with ID ${id} not found for deletion`);
        return false;
      }
      
      const userId = plan.userId;
      
      // 1. First deactivate the plan (this will handle unlinking workouts and meals)
      const deactivated = await this.deactivateFitnessPlan(id);
      if (!deactivated) {
        console.error(`Failed to deactivate plan ${id} before deletion`);
        return false;
      }
      
      // 2. Now delete the fitness plan
      const result = await db
        .delete(fitnessPlans)
        .where(eq(fitnessPlans.id, id))
        .returning({ id: fitnessPlans.id });
      
      if (result.length === 0) {
        console.error(`Failed to delete fitness plan ${id}`);
        return false;
      }
      
      console.log(`Successfully deleted fitness plan ${id} for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting fitness plan ${id}:`, error);
      return false;
    }
  }
  
  async getTrainerPlans(trainerId: number): Promise<FitnessPlan[]> {
    try {
      // Get all clients for this trainer
      const trainerClients = await this.getTrainerClients(trainerId);
      
      if (!trainerClients || trainerClients.length === 0) {
        return [];
      }
      
      // Get the client IDs
      const clientIds = trainerClients.map(tc => tc.client.id);
      
      // Get fitness plans for these clients
      const plans = await db
        .select()
        .from(fitnessPlans)
        .where(inArray(fitnessPlans.userId, clientIds))
        .orderBy(desc(fitnessPlans.createdAt));
      
      return plans;
    } catch (error) {
      console.error("Error fetching trainer plans:", error);
      return [];
    }
  }
  
  // Goals management
  async getGoals(userId: number): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(desc(goals.createdAt));
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal;
  }

  async createGoal(userId: number, insertGoal: InsertGoal): Promise<Goal> {
    const [goal] = await db.insert(goals).values({
      ...insertGoal,
      userId,
    }).returning();
    return goal;
  }

  async updateGoal(id: number, goalUpdate: Partial<InsertGoal>): Promise<Goal | undefined> {
    const [updatedGoal] = await db
      .update(goals)
      .set(goalUpdate)
      .where(eq(goals.id, id))
      .returning();
    return updatedGoal;
  }

  async deleteGoal(id: number): Promise<boolean> {
    const result = await db.delete(goals).where(eq(goals.id, id)).returning({ id: goals.id });
    return result.length > 0;
  }
  
  // System settings
  async getSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    return setting;
  }
  
  async setSetting(key: string, value: string, description?: string): Promise<SystemSetting> {
    // Check if setting exists
    const existingSetting = await this.getSetting(key);
    
    if (existingSetting) {
      // Update existing setting
      const [updatedSetting] = await db
        .update(systemSettings)
        .set({ 
          value, 
          description: description || existingSetting.description,
          updatedAt: new Date()
        })
        .where(eq(systemSettings.key, key))
        .returning();
      return updatedSetting;
    } else {
      // Create new setting
      const [newSetting] = await db
        .insert(systemSettings)
        .values({
          key,
          value,
          description
        })
        .returning();
      return newSetting;
    }
  }
  
  async getSettings(): Promise<SystemSetting[]> {
    return await db
      .select()
      .from(systemSettings)
      .orderBy(asc(systemSettings.key));
  }

  // Exercise Library
  async getExerciseLibrary(): Promise<ExerciseLibrary[]> {
    return await db
      .select()
      .from(exerciseLibrary)
      .orderBy(exerciseLibrary.name);
  }
  
  async getExerciseLibraryByMuscleGroup(muscleGroup: string): Promise<ExerciseLibrary[]> {
    return await db
      .select()
      .from(exerciseLibrary)
      .where(eq(exerciseLibrary.muscleGroup, muscleGroup))
      .orderBy(exerciseLibrary.name);
  }
  
  async getExerciseLibraryById(id: number): Promise<ExerciseLibrary | undefined> {
    const [exercise] = await db
      .select()
      .from(exerciseLibrary)
      .where(eq(exerciseLibrary.id, id));
    return exercise;
  }
  
  async createExerciseLibraryEntry(exercise: InsertExerciseLibrary): Promise<ExerciseLibrary> {
    const [newExercise] = await db
      .insert(exerciseLibrary)
      .values(exercise)
      .returning();
    return newExercise;
  }
  
  async updateExerciseLibraryEntry(id: number, exerciseUpdate: Partial<InsertExerciseLibrary>): Promise<ExerciseLibrary | undefined> {
    const [updatedExercise] = await db
      .update(exerciseLibrary)
      .set({
        ...exerciseUpdate,
        updatedAt: new Date()
      })
      .where(eq(exerciseLibrary.id, id))
      .returning();
    return updatedExercise;
  }
  
  async deleteExerciseLibraryEntry(id: number): Promise<boolean> {
    const result = await db
      .delete(exerciseLibrary)
      .where(eq(exerciseLibrary.id, id))
      .returning({ id: exerciseLibrary.id });
    return result.length > 0;
  }
  
  // Saved Meals (Personal Meal Library)
  async getSavedMeals(userId: number): Promise<SavedMeal[]> {
    return await db
      .select()
      .from(savedMeals)
      .where(eq(savedMeals.userId, userId))
      .orderBy(desc(savedMeals.createdAt));
  }
  
  async getSavedMealsByType(userId: number, mealType: string): Promise<SavedMeal[]> {
    return await db
      .select()
      .from(savedMeals)
      .where(
        and(
          eq(savedMeals.userId, userId),
          eq(savedMeals.mealType, mealType)
        )
      )
      .orderBy(desc(savedMeals.createdAt));
  }
  
  async getSavedMeal(id: number): Promise<SavedMeal | undefined> {
    const [meal] = await db
      .select()
      .from(savedMeals)
      .where(eq(savedMeals.id, id));
    return meal;
  }
  
  async createSavedMeal(userId: number, insertMeal: InsertSavedMeal): Promise<SavedMeal> {
    const [meal] = await db
      .insert(savedMeals)
      .values({
        ...insertMeal,
        userId,
      })
      .returning();
    return meal;
  }
  
  async updateSavedMeal(id: number, mealUpdate: Partial<InsertSavedMeal>): Promise<SavedMeal | undefined> {
    const [updatedMeal] = await db
      .update(savedMeals)
      .set({
        ...mealUpdate,
        updatedAt: new Date()
      })
      .where(eq(savedMeals.id, id))
      .returning();
    return updatedMeal;
  }
  
  async deleteSavedMeal(id: number): Promise<boolean> {
    const result = await db
      .delete(savedMeals)
      .where(eq(savedMeals.id, id))
      .returning({ id: savedMeals.id });
    return result.length > 0;
  }

  // Trainer-Client management methods implementation
  async getTrainers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.isTrainer, true))
      .orderBy(asc(users.username));
  }

  async makeUserTrainer(userId: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ isTrainer: true })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async removeTrainerStatus(userId: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ isTrainer: false })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getTrainerClients(trainerId: number): Promise<{ client: User, relationship: TrainerClient }[]> {
    const result = await db.select({
      relationship: trainerClients,
      client: users
    })
    .from(trainerClients)
    .innerJoin(users, eq(trainerClients.clientId, users.id))
    .where(eq(trainerClients.trainerId, trainerId))
    .orderBy(asc(users.username));

    return result.map(item => ({
      client: item.client,
      relationship: item.relationship
    }));
  }

  async getClientTrainers(clientId: number): Promise<{ trainer: User, relationship: TrainerClient }[]> {
    const result = await db.select({
      relationship: trainerClients,
      trainer: users
    })
    .from(trainerClients)
    .innerJoin(users, eq(trainerClients.trainerId, users.id))
    .where(eq(trainerClients.clientId, clientId))
    .orderBy(asc(users.username));

    return result.map(item => ({
      trainer: item.trainer,
      relationship: item.relationship
    }));
  }

  async assignClientToTrainer(trainerId: number, clientId: number, notes?: string): Promise<TrainerClient> {
    // Check for existing relationship 
    const existingRelationship = await db
      .select()
      .from(trainerClients)
      .where(
        and(
          eq(trainerClients.trainerId, trainerId),
          eq(trainerClients.clientId, clientId)
        )
      );

    if (existingRelationship.length > 0) {
      // If relationship already exists, update notes if provided
      if (notes) {
        const [updated] = await db
          .update(trainerClients)
          .set({ notes })
          .where(eq(trainerClients.id, existingRelationship[0].id))
          .returning();
        return updated;
      }
      return existingRelationship[0];
    }

    // Create new relationship
    const [relationship] = await db
      .insert(trainerClients)
      .values({
        trainerId,
        clientId,
        notes: notes || null
      })
      .returning();
    
    return relationship;
  }

  async removeClientFromTrainer(trainerId: number, clientId: number): Promise<boolean> {
    const result = await db
      .delete(trainerClients)
      .where(
        and(
          eq(trainerClients.trainerId, trainerId),
          eq(trainerClients.clientId, clientId)
        )
      )
      .returning({ id: trainerClients.id });
    
    return result.length > 0;
  }

  async updateTrainerClientNotes(id: number, notes: string): Promise<TrainerClient | undefined> {
    const [updated] = await db
      .update(trainerClients)
      .set({ notes })
      .where(eq(trainerClients.id, id))
      .returning();
    
    return updated;
  }
  
  /**
   * Removes a trainer-client relationship
   * This effectively "ends" the trainer-client relationship permanently
   */
  async removeTrainerClient(relationshipId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(trainerClients)
        .where(eq(trainerClients.id, relationshipId))
        .returning({ id: trainerClients.id });
      
      return result.length > 0;
    } catch (error) {
      console.error("Error removing trainer-client relationship:", error);
      return false;
    }
  }

  // Trainer-Client Request Management
  async createTrainerClientRequest(request: InsertTrainerClientRequest): Promise<TrainerClientRequest> {
    const [newRequest] = await db
      .insert(trainerClientRequests)
      .values(request)
      .returning();
    
    return newRequest;
  }
  
  async getTrainerClientRequests(trainerId: number): Promise<(TrainerClientRequest & { client?: PartialUser })[]> {
    const result = await db
      .select({
        request: trainerClientRequests,
        client: users,
      })
      .from(trainerClientRequests)
      .leftJoin(users, eq(trainerClientRequests.clientId, users.id))
      .where(eq(trainerClientRequests.trainerId, trainerId))
      .orderBy(desc(trainerClientRequests.requestedAt));
    
    // Combine the results into a single object with client info
    return result.map(item => ({
      ...item.request,
      client: item.client ? {
        id: item.client.id,
        username: item.client.username,
        email: item.client.email,
        isApproved: item.client.isApproved
      } : undefined
    }));
  }
  
  async getClientTrainerRequests(clientId: number): Promise<(TrainerClientRequest & { trainer?: PartialUser })[]> {
    const result = await db
      .select({
        request: trainerClientRequests,
        trainer: users,
      })
      .from(trainerClientRequests)
      .leftJoin(users, eq(trainerClientRequests.trainerId, users.id))
      .where(eq(trainerClientRequests.clientId, clientId))
      .orderBy(desc(trainerClientRequests.requestedAt));
    
    // Combine the results into a single object with trainer info
    return result.map(item => ({
      ...item.request,
      trainer: item.trainer ? {
        id: item.trainer.id,
        username: item.trainer.username,
        email: item.trainer.email,
        isTrainer: item.trainer.isTrainer
      } : undefined
    }));
  }
  
  async getTrainerClientRequestById(id: number): Promise<TrainerClientRequest | undefined> {
    const [request] = await db
      .select()
      .from(trainerClientRequests)
      .where(eq(trainerClientRequests.id, id));
    
    return request;
  }
  
  async respondToTrainerClientRequest(id: number, status: string): Promise<TrainerClientRequest | undefined> {
    console.log(`Responding to trainer client request ${id} with status: ${status}`);
    
    // First get the request to make sure it exists
    const existingRequest = await this.getTrainerClientRequestById(id);
    if (!existingRequest) {
      console.log(`Request ${id} not found`);
      return undefined;
    }
    
    console.log(`Found existing request: ${JSON.stringify(existingRequest)}`);
    
    // Check if the request status is already changed
    if (existingRequest.status !== 'pending') {
      console.log(`Request ${id} is already ${existingRequest.status}, not changing status`);
      return existingRequest;
    }
    
    // Update the request status
    try {
      const [updatedRequest] = await db
        .update(trainerClientRequests)
        .set({ 
          status, 
          responseAt: new Date() 
        })
        .where(eq(trainerClientRequests.id, id))
        .returning();
      
      if (!updatedRequest) {
        console.log(`Failed to update request ${id}`);
        return undefined;
      }
      
      console.log(`Updated request: ${JSON.stringify(updatedRequest)}`);
      
      // If the status is 'accepted', create a trainer-client relationship
      if (status === 'accepted') {
        console.log(`Creating trainer-client relationship: trainer=${updatedRequest.trainerId}, client=${updatedRequest.clientId}`);
        try {
          const relationship = await this.assignClientToTrainer(
            updatedRequest.trainerId, 
            updatedRequest.clientId,
            updatedRequest.message || undefined
          );
          console.log(`Created relationship: ${JSON.stringify(relationship)}`);
        } catch (error) {
          console.error(`Error creating trainer-client relationship: ${error}`);
          // Continue processing even if relationship creation fails
        }
      }
      
      return updatedRequest;
    } catch (error) {
      console.error(`Error updating trainer request ${id}: ${error}`);
      return undefined;
    }
  }
  
  async deleteTrainerClientRequest(id: number): Promise<boolean> {
    const result = await db
      .delete(trainerClientRequests)
      .where(eq(trainerClientRequests.id, id))
      .returning({ id: trainerClientRequests.id });
    
    return result.length > 0;
  }
  
  // Trainer-Client Messaging
  async createTrainerMessage(message: InsertTrainerMessage): Promise<TrainerMessage> {
    const [newMessage] = await db
      .insert(trainerMessages)
      .values(message)
      .returning();
    
    return newMessage;
  }
  
  async getTrainerClientMessages(trainerId: number, clientId: number): Promise<TrainerMessage[]> {
    return await db
      .select()
      .from(trainerMessages)
      .where(
        and(
          eq(trainerMessages.trainerId, trainerId),
          eq(trainerMessages.clientId, clientId)
        )
      )
      .orderBy(asc(trainerMessages.sentAt));
  }
  
  async getUnreadMessagesCount(userId: number): Promise<number> {
    // For trainers - count messages from their clients
    const trainerUnreadCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(trainerMessages)
      .where(
        and(
          eq(trainerMessages.trainerId, userId),
          eq(trainerMessages.isRead, false),
          not(eq(trainerMessages.senderId, userId))
        )
      );
      
    // For clients - count messages from their trainers
    const clientUnreadCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(trainerMessages)
      .where(
        and(
          eq(trainerMessages.clientId, userId),
          eq(trainerMessages.isRead, false),
          not(eq(trainerMessages.senderId, userId))
        )
      );
    
    return (trainerUnreadCount[0]?.count || 0) + (clientUnreadCount[0]?.count || 0);
  }
  
  async markMessagesAsRead(userId: number, messageIds: number[]): Promise<boolean> {
    if (messageIds.length === 0) return true;
    
    const result = await db
      .update(trainerMessages)
      .set({ isRead: true })
      .where(
        and(
          inArray(trainerMessages.id, messageIds),
          not(eq(trainerMessages.senderId, userId)) // Only mark messages as read if the user is not the sender
        )
      )
      .returning({ id: trainerMessages.id });
    
    return result.length > 0;
  }
  
  // This function was a duplicate of the one defined earlier in the class
  // The implementation has been removed to avoid duplication
  
  // Trainer Nutrition Plans
  async getTrainerNutritionPlans(trainerId: number): Promise<TrainerNutritionPlan[]> {
    return await db
      .select()
      .from(trainerNutritionPlans)
      .where(eq(trainerNutritionPlans.trainerId, trainerId))
      .orderBy(desc(trainerNutritionPlans.createdAt));
  }
  
  async getClientNutritionPlans(clientId: number): Promise<(TrainerNutritionPlan & { trainer?: PartialUser })[]> {
    const plans = await db
      .select({
        plan: trainerNutritionPlans,
        trainer: {
          id: users.id,
          username: users.username,
          email: users.email,
          isTrainer: users.isTrainer,
          isApproved: users.isApproved
        }
      })
      .from(trainerNutritionPlans)
      .leftJoin(users, eq(trainerNutritionPlans.trainerId, users.id))
      .where(eq(trainerNutritionPlans.clientId, clientId))
      .orderBy(desc(trainerNutritionPlans.createdAt));
    
    return plans.map(item => {
      // Convert null trainer to undefined to match the type definition
      return {
        ...item.plan, 
        trainer: item.trainer || undefined
      };
    });
  }
  
  async getTrainerNutritionPlan(id: number): Promise<TrainerNutritionPlan | undefined> {
    const [plan] = await db
      .select()
      .from(trainerNutritionPlans)
      .where(eq(trainerNutritionPlans.id, id));
    return plan;
  }
  
  async createTrainerNutritionPlan(plan: InsertTrainerNutritionPlan): Promise<TrainerNutritionPlan> {
    const [nutritionPlan] = await db
      .insert(trainerNutritionPlans)
      .values({
        ...plan,
        updatedAt: new Date() // Ensure updatedAt is set correctly
      })
      .returning();
    return nutritionPlan;
  }
  
  async updateTrainerNutritionPlan(id: number, planUpdate: Partial<InsertTrainerNutritionPlan>): Promise<TrainerNutritionPlan | undefined> {
    const [updatedPlan] = await db
      .update(trainerNutritionPlans)
      .set({
        ...planUpdate,
        updatedAt: new Date() // Always update the updatedAt timestamp
      })
      .where(eq(trainerNutritionPlans.id, id))
      .returning();
    return updatedPlan;
  }
  
  async deleteTrainerNutritionPlan(id: number): Promise<boolean> {
    const result = await db
      .delete(trainerNutritionPlans)
      .where(eq(trainerNutritionPlans.id, id))
      .returning({ id: trainerNutritionPlans.id });
    return result.length > 0;
  }
  
  // Trainer Fitness Plans
  async getTrainerFitnessPlans(trainerId: number): Promise<TrainerFitnessPlan[]> {
    return await db
      .select()
      .from(trainerFitnessPlans)
      .where(eq(trainerFitnessPlans.trainerId, trainerId))
      .orderBy(desc(trainerFitnessPlans.createdAt));
  }
  
  async getClientFitnessPlans(clientId: number): Promise<(TrainerFitnessPlan & { trainer?: PartialUser })[]> {
    const plans = await db
      .select({
        plan: trainerFitnessPlans,
        trainer: {
          id: users.id,
          username: users.username,
          email: users.email,
          isTrainer: users.isTrainer,
          isApproved: users.isApproved
        }
      })
      .from(trainerFitnessPlans)
      .leftJoin(users, eq(trainerFitnessPlans.trainerId, users.id))
      .where(eq(trainerFitnessPlans.clientId, clientId))
      .orderBy(desc(trainerFitnessPlans.createdAt));
    
    return plans.map(item => {
      // Convert null trainer to undefined to match the type definition
      return {
        ...item.plan, 
        trainer: item.trainer || undefined
      };
    });
  }
  
  async getTrainerFitnessPlan(id: number): Promise<TrainerFitnessPlan | undefined> {
    const [plan] = await db
      .select()
      .from(trainerFitnessPlans)
      .where(eq(trainerFitnessPlans.id, id));
    return plan;
  }
  
  async createTrainerFitnessPlan(plan: InsertTrainerFitnessPlan): Promise<TrainerFitnessPlan> {
    const [fitnessPlan] = await db
      .insert(trainerFitnessPlans)
      .values({
        ...plan,
        updatedAt: new Date() // Ensure updatedAt is set correctly
      })
      .returning();
    return fitnessPlan;
  }
  
  async updateTrainerFitnessPlan(id: number, planUpdate: Partial<InsertTrainerFitnessPlan>): Promise<TrainerFitnessPlan | undefined> {
    const [updatedPlan] = await db
      .update(trainerFitnessPlans)
      .set({
        ...planUpdate,
        updatedAt: new Date() // Always update the updatedAt timestamp
      })
      .where(eq(trainerFitnessPlans.id, id))
      .returning();
    return updatedPlan;
  }
  
  async deleteTrainerFitnessPlan(id: number): Promise<boolean> {
    const result = await db
      .delete(trainerFitnessPlans)
      .where(eq(trainerFitnessPlans.id, id))
      .returning({ id: trainerFitnessPlans.id });
    return result.length > 0;
  }
  // Password Reset Token Management
  async createPasswordResetToken(userId: number, token: string, expiryHours: number = 1): Promise<PasswordResetToken> {
    // Delete any existing tokens for this user
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
    
    // Create expiry date (default 1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);
    
    // Create new token
    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values({
        userId,
        token,
        expiresAt,
      })
      .returning();
    
    return resetToken;
  }
  
  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    
    return resetToken;
  }
  
  async invalidatePasswordResetToken(token: string): Promise<boolean> {
    // Mark token as used
    const result = await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token))
      .returning({ id: passwordResetTokens.id });
    
    return result.length > 0;
  }
  
  // Plan Generation Status methods
  
  /**
   * Delete the plan generation status for a user
   * This is used to completely reset the plan generation state
   */
  async deletePlanGenerationStatus(userId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(planGenerationStatus)
        .where(eq(planGenerationStatus.userId, userId))
        .returning({ userId: planGenerationStatus.userId });
      
      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting plan generation status for user ${userId}:`, error);
      return false;
    }
  }
  
  /**
   * Deactivate all fitness plans for a user
   * This is used to clear the active state of plans when resetting
   */
  async deactivateUserFitnessPlans(userId: number): Promise<boolean> {
    try {
      const result = await db
        .update(fitnessPlans)
        .set({ isActive: false })
        .where(eq(fitnessPlans.userId, userId))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error(`Error deactivating fitness plans for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get a system setting value by key
   */
  async getSystemSetting(key: string): Promise<string | null> {
    try {
      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key));
      
      return setting ? setting.value : null;
    } catch (error) {
      console.error(`Error getting system setting ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a system setting value
   */
  async setSystemSetting(key: string, value: string): Promise<boolean> {
    try {
      // First check if the setting already exists
      const existingSetting = await this.getSystemSetting(key);
      
      if (existingSetting !== null) {
        // Update existing setting
        await db
          .update(systemSettings)
          .set({ value })
          .where(eq(systemSettings.key, key));
      } else {
        // Create new setting
        await db
          .insert(systemSettings)
          .values({ key, value });
      }
      
      return true;
    } catch (error) {
      console.error(`Error setting system setting ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if a user is eligible to generate a new fitness plan
   * Considers limits like frequency of generation and account status
   */
  async checkPlanGenerationEligibility(userId: number): Promise<{ canCreate: boolean; message?: string; daysRemaining?: number }> {
    try {
      // Check if plan generation is globally disabled
      const disabledSetting = await this.getSystemSetting('fitness_coach_globally_disabled');
      if (disabledSetting === 'true') {
        return { 
          canCreate: false, 
          message: 'Plan generation is temporarily disabled. Please try again later.'
        };
      }
      
      // Check frequency limit based on system settings
      const frequencySetting = await this.getSystemSetting('plan_generation_frequency_days');
      const frequencyDays = frequencySetting ? parseInt(frequencySetting, 10) : 0;
      
      if (frequencyDays > 0) {
        // Get the user's most recent plan
        const recentPlans = await db
          .select({ createdAt: fitnessPlans.createdAt })
          .from(fitnessPlans)
          .where(eq(fitnessPlans.userId, userId))
          .orderBy(desc(fitnessPlans.createdAt))
          .limit(1);
        
        if (recentPlans.length > 0) {
          const daysSinceLastPlan = Math.floor(
            (Date.now() - new Date(recentPlans[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysSinceLastPlan < frequencyDays) {
            const daysRemaining = frequencyDays - daysSinceLastPlan;
            return {
              canCreate: false,
              message: `You can generate a new plan in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`,
              daysRemaining
            };
          }
        }
      }
      
      // Check if user already has an ongoing plan generation
      const existingStatus = await this.getPlanGenerationStatus(userId);
      if (existingStatus && existingStatus.isGenerating) {
        return {
          canCreate: false,
          message: 'You already have a plan generation in progress. Please wait for it to complete or cancel it before starting a new one.'
        };
      }
      
      // All checks passed, user is eligible
      return { canCreate: true };
    } catch (error) {
      console.error('Error checking plan generation eligibility:', error);
      // Default to allowing plan generation if there's an error checking
      return { canCreate: true };
    }
  }
  
  async getPlanGenerationStatus(userId: number): Promise<PlanGenerationStatus | undefined> {
    try {
      const [status] = await db
        .select()
        .from(planGenerationStatus)
        .where(eq(planGenerationStatus.userId, userId));
      
      // Check for stale generation status but only log it, don't auto-reset
      // This avoids the constant reset loop we were experiencing
      if (status && status.isGenerating) {
        const MAX_GENERATION_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds
        const updatedAt = new Date(status.updatedAt).getTime();
        const now = new Date().getTime();
        
        if (now - updatedAt > MAX_GENERATION_TIME) {
          console.log(`Found stale plan generation status for user ${userId}. It should be reset manually.`);
          // Don't auto-reset here, just return the current status
          // This prevents a reset loop when the status is regularly queried
        }
      }
      
      return status;
    } catch (error) {
      console.error("Error getting plan generation status:", error);
      return undefined;
    }
  }

  async setPlanGenerationStatus(
    userId: number, 
    isGenerating: boolean,
    progressData?: {
      currentStep?: number;
      totalSteps?: number;
      stepMessage?: string;
      estimatedTimeRemaining?: number;
      errorMessage?: string;
      retryCount?: number;
    }
  ): Promise<PlanGenerationStatus> {
    try {
      // First check if a status already exists
      const existingStatus = await this.getPlanGenerationStatus(userId);
      
      // Prepare update data
      const updateData: any = { 
        isGenerating,
        updatedAt: new Date()
      };
      
      // Add progress data if provided
      if (progressData) {
        if (progressData.currentStep !== undefined) updateData.currentStep = progressData.currentStep;
        if (progressData.totalSteps !== undefined) updateData.totalSteps = progressData.totalSteps;
        if (progressData.stepMessage !== undefined) updateData.stepMessage = progressData.stepMessage;
        if (progressData.estimatedTimeRemaining !== undefined) updateData.estimatedTimeRemaining = progressData.estimatedTimeRemaining;
        if (progressData.errorMessage !== undefined) updateData.errorMessage = progressData.errorMessage;
        if (progressData.retryCount !== undefined) updateData.retryCount = progressData.retryCount;
      }
      
      // Record this action for logging purposes
      console.log(`[Plan Generation] Updating status for user ${userId}:`, {
        isGenerating,
        ...(progressData || {}),
        timestamp: new Date().toISOString()
      });
      
      if (existingStatus) {
        // Update existing status
        const [updatedStatus] = await db
          .update(planGenerationStatus)
          .set(updateData)
          .where(eq(planGenerationStatus.userId, userId))
          .returning();
        return updatedStatus;
      } else {
        // Create new status with default values
        const insertData = {
          userId,
          isGenerating,
          startedAt: new Date(),
          updatedAt: new Date(),
          currentStep: progressData?.currentStep || 0,
          totalSteps: progressData?.totalSteps || 5,
          stepMessage: progressData?.stepMessage || '',
          estimatedTimeRemaining: progressData?.estimatedTimeRemaining || 60,
          errorMessage: progressData?.errorMessage || null,
          retryCount: progressData?.retryCount || 0
        };
        
        const [newStatus] = await db
          .insert(planGenerationStatus)
          .values(insertData)
          .returning();
        return newStatus;
      }
    } catch (error) {
      console.error("Error setting plan generation status:", error);
      throw error;
    }
  }

  async clearPlanGenerationStatus(userId: number): Promise<boolean> {
    try {
      console.log(`Completely removing plan generation status for user ${userId}`);
      
      // First try to delete the record completely
      const deleteResult = await db
        .delete(planGenerationStatus)
        .where(eq(planGenerationStatus.userId, userId))
        .returning();
        
      if (deleteResult.length > 0) {
        console.log(`Successfully deleted plan generation status record for user ${userId}`);
        return true;
      }
      
      // If no record was deleted, it might not exist, which is fine
      console.log(`No plan generation status record found to delete for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error clearing plan generation status for user ${userId}:`, error);
      
      // If deletion fails for some reason, at least try to set isGenerating to false
      try {
        console.log(`Attempting fallback: setting isGenerating=false for user ${userId}`);
        const updateResult = await db
          .update(planGenerationStatus)
          .set({ 
            isGenerating: false,
            updatedAt: new Date(),
            // Also clear any stored data to minimize space usage
            dataJson: null,
            inputJson: null,
            errorMessage: null
          })
          .where(eq(planGenerationStatus.userId, userId))
          .returning();
          
        return updateResult.length > 0;
      } catch (updateError) {
        console.error(`Fallback update also failed for user ${userId}:`, updateError);
        return false;
      }
    }
  }
  
  // Get the onboarding analysis for a user
  async getOnboardingAnalysis(userId: number): Promise<AIAnalysis | null> {
    try {
      console.log(`[DATABASE:GET:1] Retrieving onboarding analysis for user ${userId}`);
      
      // Since we're storing the analysis in the user profile itself,
      // fetch the user and extract the stored analysis
      const user = await this.getUser(userId);
      
      if (!user) {
        console.error(`[DATABASE:GET:2] User ${userId} not found when retrieving onboarding analysis`);
        return null;
      }
      
      console.log(`[DATABASE:GET:3] User found, aiAnalysis exists: ${!!user.aiAnalysis}`);
      
      if (!user.aiAnalysis) {
        console.log(`[DATABASE:GET:4] No aiAnalysis found for user ${userId}`);
        return null;
      }
      
      // Log the type and a preview of the stored analysis
      console.log(`[DATABASE:GET:5] Analysis type: ${typeof user.aiAnalysis}`);
      console.log(`[DATABASE:GET:6] Analysis preview:`, 
        typeof user.aiAnalysis === 'string'
          ? user.aiAnalysis.substring(0, 100) + '...'
          : 'Not a string, cannot show preview');
      
      // Parse the stored JSON analysis
      try {
        const parsedAnalysis = typeof user.aiAnalysis === 'string' 
          ? JSON.parse(user.aiAnalysis) 
          : user.aiAnalysis as unknown as AIAnalysis;
          
        console.log(`[DATABASE:GET:7] Successfully parsed analysis, timeframe: ${parsedAnalysis.timeframe}`);
        console.log(`[DATABASE:GET:8] Successfully retrieved analysis for user ${userId}`);
        
        return parsedAnalysis;
      } catch (parseError) {
        console.error(`[DATABASE:GET:7] Error parsing stored AI analysis for user ${userId}:`, parseError);
        return null;
      }
    } catch (error) {
      console.error(`[DATABASE:GET:X] Error retrieving onboarding analysis for user ${userId}:`, error);
      return null;
    }
  }
  
  async saveOnboardingAnalysis(userId: number, analysis: AIAnalysis): Promise<boolean> {
    try {
      // Fetch the current user to extract their fitness goal
      const user = await this.getUser(userId);
      if (!user) {
        console.error(`Cannot save onboarding analysis: User ID ${userId} not found`);
        return false;
      }
      
      // Enhanced debugging for data flow
      console.log(`[DATABASE:1] Saving onboarding analysis for user ${userId}`);
      console.log(`[DATABASE:2] Current user data:`, JSON.stringify({
        id: user.id,
        username: user.username,
        fitnessGoal: user.fitnessGoal,
        bodyType: user.bodyType,
        height: user.height,
        weight: user.weight,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth
      }));
      console.log(`[DATABASE:3] Analysis to be saved:`, JSON.stringify(analysis));
      
      // Store the analysis in the user's profile using the new aiAnalysis field
      // Convert the analysis object to a JSON string
      const analysisJSON = JSON.stringify(analysis);
      
      console.log(`[DATABASE:4] Formatted analysis JSON for DB storage: ${analysisJSON.substring(0, 100)}...`);
      console.log(`[DATABASE:5] Total analysis JSON length: ${analysisJSON.length}`);
      
      // Using a direct query to verify DB execution
      console.log(`[DATABASE:6] Executing update query for user ID: ${userId}`);
      
      try {
        // Update the user record with the analysis data
        const [updatedUser] = await db
          .update(users)
          .set({
            aiAnalysis: analysisJSON,
            // Keep the fitnessGoal separate for easy querying - only update if there's a value
            fitnessGoal: user.fitnessGoal
          })
          .where(eq(users.id, userId))
          .returning();
        
        if (updatedUser) {
          console.log(`[DATABASE:7] Successfully updated user ${userId} with analysis data`);
          console.log(`[DATABASE:8] Updated user profile:`, JSON.stringify({
            id: updatedUser.id,
            username: updatedUser.username,
            fitnessGoal: updatedUser.fitnessGoal,
            hasAnalysis: !!updatedUser.aiAnalysis,
            analysisLength: updatedUser.aiAnalysis ? updatedUser.aiAnalysis.length : 0
          }));
        } else {
          console.error(`[DATABASE:7] FAILED to update user ${userId} with analysis data, update returned no rows`);
        }
      } catch (dbError) {
        console.error(`[DATABASE:7] DB ERROR updating user ${userId}:`, dbError);
        throw dbError; // Re-throw to be caught by the outer catch block
      }
      
      // Need to re-query to determine success since updatedUser is now in a different scope
      const verifyUser = await this.getUser(userId);
      const success = verifyUser && !!verifyUser.aiAnalysis;
      console.log(`[DATABASE:9] Final verification: user exists=${!!verifyUser}, has analysis=${verifyUser ? !!verifyUser.aiAnalysis : false}`);
      return success || false; // Ensure we always return a boolean
    } catch (error) {
      console.error(`Error saving onboarding analysis for user ${userId}:`, error);
      return false;
    }
  }
  
  // Step-by-Step Plan Generation Support
  
  // Store plan generation data in a separate table or as JSON in this case
  async storePlanGenerationData(userId: number, data: import('./stepwise-coach').PlanData): Promise<boolean> {
    try {
      // For now, we'll store this in a JSON field in the plan generation status
      const existingStatus = await this.getPlanGenerationStatus(userId);
        
      if (existingStatus) {
        // Update existing status with JSON data
        await db
          .update(planGenerationStatus)
          .set({
            dataJson: JSON.stringify(data),
            updatedAt: new Date()
          })
          .where(eq(planGenerationStatus.userId, userId));
      } else {
        // Create new status with JSON data - use array of objects format for values
        await db
          .insert(planGenerationStatus)
          .values([{
            userId,
            isGenerating: true,
            startedAt: new Date(), // Use startedAt instead of createdAt
            updatedAt: new Date(),
            dataJson: JSON.stringify(data)
          }]);
      }
      return true;
    } catch (error) {
      console.error("Error storing plan generation data:", error);
      return false;
    }
  }
  
  // Retrieve plan generation data
  async getPlanGenerationData(userId: number): Promise<import('./stepwise-coach').PlanData | undefined> {
    try {
      const status = await this.getPlanGenerationStatus(userId);
        
      if (status && status.dataJson) {
        try {
          return JSON.parse(status.dataJson) as import('./stepwise-coach').PlanData;
        } catch (parseError) {
          console.error("Error parsing plan generation data JSON:", parseError);
          return undefined;
        }
      }
      return undefined;
    } catch (error) {
      console.error("Error getting plan generation data:", error);
      return undefined;
    }
  }
  
  // Store input data for step-by-step plan generation
  async storeInputData(userId: number, input: import('./coach').CoachInput | import('../client/src/types/plan-generation').PlanInput): Promise<boolean> {
    try {
      // For now, we'll store this in a JSON field in the plan generation status
      const existingStatus = await this.getPlanGenerationStatus(userId);
        
      if (existingStatus) {
        // Update existing status with JSON data
        await db
          .update(planGenerationStatus)
          .set({
            inputJson: JSON.stringify(input),
            updatedAt: new Date()
          })
          .where(eq(planGenerationStatus.userId, userId));
      } else {
        // Create new status with JSON data - use array of objects format for values
        await db
          .insert(planGenerationStatus)
          .values([{
            userId,
            isGenerating: true,
            startedAt: new Date(), // Use startedAt instead of createdAt
            updatedAt: new Date(),
            inputJson: JSON.stringify(input)
          }]);
      }
      return true;
    } catch (error) {
      console.error("Error storing coach input:", error);
      return false;
    }
  }
  
  // Retrieve input data for step-by-step plan generation
  async getInputData(userId: number): Promise<import('./coach').CoachInput | import('../client/src/types/plan-generation').PlanInput | undefined> {
    try {
      const status = await this.getPlanGenerationStatus(userId);
        
      if (status && status.inputJson) {
        try {
          return JSON.parse(status.inputJson) as import('./coach').CoachInput | import('../client/src/types/plan-generation').PlanInput;
        } catch (parseError) {
          console.error("Error parsing coach input JSON:", parseError);
          return undefined;
        }
      }
      return undefined;
    } catch (error) {
      console.error("Error getting coach input:", error);
      return undefined;
    }
  }
}

export const storage = new DatabaseStorage();