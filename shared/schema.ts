import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// AI Analysis Interface for fitness recommendations
export interface AIAnalysis {
  timeframe: string;
  description: string;
  recommendations: string[];
}

// Define the interface for the relations helper functions
type RelationFns = {
  one: Function;
  many: Function;
};

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isTrainer: boolean("is_trainer").default(false).notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  registered_at: timestamp("registered_at").notNull().defaultNow(),
  // Physical attributes
  dateOfBirth: timestamp("date_of_birth"),
  gender: text("gender"),
  height: real("height"), // in cm
  weight: real("weight"), // in kg
  weightUnit: text("weight_unit").default("kg"),
  heightUnit: text("height_unit").default("cm"),
  fitnessGoal: text("fitness_goal"), // Legacy: weightLoss, muscleBuild, stamina, strength
  fitnessGoals: text("fitness_goals").array(), // New field for multiple goals
  bodyType: text("body_type"), // ectomorph, mesomorph, endomorph
  // Additional fitness profile data
  age: integer("age"),
  activityLevel: text("activity_level"), // sedentary, lightly_active, moderately_active, very_active, extra_active
  workoutDaysPerWeek: integer("workout_days_per_week"),
  workoutDuration: integer("workout_duration"), // in minutes
  fitnessLevel: text("fitness_level"), // beginner, intermediate, advanced
  targetWeight: real("target_weight"), // in kg/lb depending on unit
  dietaryRestrictions: text("dietary_restrictions"), // comma-separated list or JSON string
  weeklyBudget: real("weekly_budget"), // for meal planning
  // AI Analysis storage
  aiAnalysis: text("ai_analysis"), // JSON string containing the AI analysis
  // Onboarding status
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false).notNull(),
  // Analysis acknowledgment status
  hasAcknowledgedAnalysis: boolean("has_acknowledged_analysis").default(false),
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  usedAt: timestamp("used_at"),
});

// Trainer-Client relationships
export const trainerClients = pgTable("trainer_clients", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientId: integer("client_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  notes: text("notes"),
});

// Messages between trainers and clients
export const trainerMessages = pgTable("trainer_messages", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientId: integer("client_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  messageType: text("message_type").default("text").notNull(), // "text", "video", "image", etc.
  mediaUrl: text("media_url"), // URL for videos or images
  thumbnailUrl: text("thumbnail_url"), // For video/image thumbnails
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  isRead: boolean("is_read").default(false).notNull(),
});

// Trainer-Client requests (for connecting existing users)
export const trainerClientRequests = pgTable("trainer_client_requests", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientId: integer("client_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  message: text("message"),
  responseAt: timestamp("response_at"),
});

// Relations for trainerClients
export const trainerClientsRelations = relations(trainerClients, ({ one }) => ({
  trainer: one(users, { relationName: "trainer", fields: [trainerClients.trainerId], references: [users.id] }),
  client: one(users, { relationName: "client", fields: [trainerClients.clientId], references: [users.id] }),
}));

// Relations for trainerClientRequests
export const trainerClientRequestsRelations = relations(trainerClientRequests, ({ one }) => ({
  trainer: one(users, { relationName: "requestTrainer", fields: [trainerClientRequests.trainerId], references: [users.id] }),
  client: one(users, { relationName: "requestClient", fields: [trainerClientRequests.clientId], references: [users.id] }),
}));

// Relations for trainerMessages
export const trainerMessagesRelations = relations(trainerMessages, ({ one }) => ({
  trainer: one(users, { relationName: "messageTrainer", fields: [trainerMessages.trainerId], references: [users.id] }),
  client: one(users, { relationName: "messageClient", fields: [trainerMessages.clientId], references: [users.id] }),
  sender: one(users, { relationName: "messageSender", fields: [trainerMessages.senderId], references: [users.id] }),
}));

// Trainer-created nutrition values for clients
export const trainerNutritionPlans = pgTable("trainer_nutrition_plans", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientId: integer("client_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  caloriesTarget: integer("calories_target").notNull(),
  proteinTarget: real("protein_target").notNull(),
  carbsTarget: real("carbs_target").notNull(),
  fatTarget: real("fat_target").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  active: boolean("active").default(true).notNull(),
});

// Create insert schema for trainer nutrition plans
export const insertTrainerNutritionPlanSchema = createInsertSchema(trainerNutritionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainerNutritionPlan = z.infer<typeof insertTrainerNutritionPlanSchema>;
export type TrainerNutritionPlan = typeof trainerNutritionPlans.$inferSelect;

// Relations for trainer nutrition plans
export const trainerNutritionPlansRelations = relations(trainerNutritionPlans, ({ one }) => ({
  trainer: one(users, { fields: [trainerNutritionPlans.trainerId], references: [users.id] }),
  client: one(users, { fields: [trainerNutritionPlans.clientId], references: [users.id] }),
}));

// Custom fitness plans created by trainers for their clients
export const trainerFitnessPlans = pgTable("trainer_fitness_plans", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientId: integer("client_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  // Enhanced flexibility with JSON structures
  workoutPlan: jsonb("workout_plan").notNull(), // Contains workout structure with exercise variations
  mealPlan: jsonb("meal_plan").notNull(),       // Contains flexible meal plan structure with custom meal types
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  notes: text("notes"),
});

// Create insert schema for trainer fitness plans
export const insertTrainerFitnessPlanSchema = createInsertSchema(trainerFitnessPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainerFitnessPlan = z.infer<typeof insertTrainerFitnessPlanSchema>;
export type TrainerFitnessPlan = typeof trainerFitnessPlans.$inferSelect;

// Relations for trainer fitness plans
export const trainerFitnessPlansRelations = relations(trainerFitnessPlans, ({ one }) => ({
  trainer: one(users, { fields: [trainerFitnessPlans.trainerId], references: [users.id] }),
  client: one(users, { fields: [trainerFitnessPlans.clientId], references: [users.id] }),
}));

// Base user schema with only essential fields for registration
export const baseUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  isAdmin: true,
  isTrainer: true,
  isApproved: true,
  registered_at: true,
});

// Extended user schema with profile fields for updates and onboarding
export const userProfileSchema = createInsertSchema(users).pick({
  dateOfBirth: true,
  gender: true,
  height: true,
  weight: true,
  heightUnit: true,
  weightUnit: true,
  fitnessGoal: true,
  fitnessGoals: true,
  bodyType: true,
  age: true,
  activityLevel: true,
  workoutDaysPerWeek: true,
  workoutDuration: true,
  fitnessLevel: true,
  targetWeight: true,
  dietaryRestrictions: true,
  weeklyBudget: true,
  // Add analysis related fields
  hasCompletedOnboarding: true,
  hasAcknowledgedAnalysis: true,
  aiAnalysis: true
}).extend({
  // Transform string dates to timestamps for the database
  dateOfBirth: z.union([
    z.string().transform(dateStr => new Date(dateStr)),
    z.date(),
    z.null()
  ]).optional(),
});

// Complete user schema for insertions
export const insertUserSchema = baseUserSchema;

export const insertTrainerClientSchema = createInsertSchema(trainerClients).omit({
  id: true,
});

export const insertTrainerClientRequestSchema = createInsertSchema(trainerClientRequests).omit({
  id: true,
  requestedAt: true,
  responseAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrainerClient = z.infer<typeof insertTrainerClientSchema>;
export type TrainerClient = typeof trainerClients.$inferSelect;
export type InsertTrainerClientRequest = z.infer<typeof insertTrainerClientRequestSchema>;
export type TrainerClientRequest = typeof trainerClientRequests.$inferSelect;

// Create insert schema for trainer messages
export const insertTrainerMessageSchema = createInsertSchema(trainerMessages).omit({
  id: true,
  sentAt: true,
}).extend({
  // Add validation for multimedia messages
  messageType: z.enum(['text', 'video', 'image', 'file']).default('text'),
  mediaUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
});

export type InsertTrainerMessage = z.infer<typeof insertTrainerMessageSchema>;
export type TrainerMessage = typeof trainerMessages.$inferSelect;

// Nutritional Entries
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  servingSize: real("serving_size").notNull(),
  servingUnit: text("serving_unit").notNull(),
  calories: integer("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  isPlanned: boolean("is_planned").default(false).notNull(), // True if automatically generated from plan, false if user logged it
});

export const insertMealSchema = createInsertSchema(meals).omit({
  id: true,
  userId: true,
});

export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof meals.$inferSelect;

// Workout Entries
export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  duration: integer("duration").notNull(), // in minutes
  notes: text("notes"),
  completed: boolean("completed").default(false).notNull(),
  isPlanMode: boolean("is_plan_mode").default(false), // Flag for workouts in plan mode
});

// Create a base schema and then modify it to handle the date format issue
const baseWorkoutSchema = createInsertSchema(workouts).omit({
  id: true,
  userId: true,
});

// Modified schema that accepts string dates and converts them to Date objects
export const insertWorkoutSchema = baseWorkoutSchema.extend({
  date: z.union([
    z.string().transform(dateStr => new Date(dateStr)),
    z.date()
  ]),
  // Add isPlanMode flag to the schema
  isPlanMode: z.boolean().optional()
});

export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type Workout = typeof workouts.$inferSelect;

// SetData type for per-set tracking with enhanced flexibility
export interface SetData {
  reps?: number | null;
  weight?: number | null;
  completed?: boolean;
  // Additional fields for set variations
  setType?: string;  // regular, drop, super, circuit, etc.
  targetRPE?: number; // Rate of Perceived Exertion (1-10)
  tempo?: string;    // e.g., "3-1-3" for eccentric-pause-concentric timing
  distance?: number; // For cardio/distance-based exercises
  duration?: number; // For timed sets
  restAfter?: number; // Rest time after this specific set (in seconds)
  notes?: string;    // Notes specific to this set
}

// Exercise Entries (linked to workouts)
export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  sets: integer("sets").notNull(),
  reps: integer("reps"), // Now mainly used as default value for new sets
  weight: real("weight"), // Now mainly used as default value for new sets
  unit: text("unit").default("kg"),
  rest: text("rest") // Rest time can be in seconds (integer) or text format like "hold for 60 secs"
});

// Exercise Sets (linked to exercises)
export const exerciseSets = pgTable("exercise_sets", {
  id: serial("id").primaryKey(),
  exerciseId: integer("exercise_id").notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps"),
  weight: real("weight"),
  completed: boolean("completed").default(false),
  setType: text("set_type"),
  targetRPE: real("target_rpe"),
  tempo: text("tempo"),
  distance: real("distance"),
  duration: real("duration"),
  restAfter: real("rest_after"),
  notes: text("notes"),
});

// Create the base schema from the database table
const baseExerciseSchema = createInsertSchema(exercises).omit({
  id: true,
});

// Create the base schema for exercise sets
const baseExerciseSetSchema = createInsertSchema(exerciseSets).omit({
  id: true,
});

export const insertExerciseSetSchema = baseExerciseSetSchema;
export type InsertExerciseSet = z.infer<typeof insertExerciseSetSchema>;
export type ExerciseSet = typeof exerciseSets.$inferSelect;

// Add setsData to the insert schema for client-server communication
export const insertExerciseSchema = baseExerciseSchema.extend({
  // Make reps optional to support plan mode
  reps: z.number().optional(),
  setsData: z.array(z.object({
    reps: z.number().optional(), // Make reps optional to support plan mode
    weight: z.number().optional(), // Make weight optional for consistency
    completed: z.boolean().optional(),
    // Add the extended fields for set variations
    setType: z.string().optional(),
    targetRPE: z.number().optional(),
    tempo: z.string().optional(),
    distance: z.number().optional(),
    duration: z.number().optional(),
    restAfter: z.number().optional(),
    notes: z.string().optional()
  })).optional(),
  // Add new fields for advanced set configuration
  useAdvancedSets: z.boolean().optional(),
  setType: z.string().optional(),
  supersetWith: z.string().optional()
});

export type InsertExercise = z.infer<typeof insertExerciseSchema>;
// Base type from database
export type ExerciseBase = typeof exercises.$inferSelect;
// Extended type with runtime properties
export interface Exercise extends ExerciseBase {
  setsData?: SetData[];
  notes?: string | null;
  useAdvancedSets?: boolean;
  setType?: string;           // Default set type for all sets (regular, drop, pyramid, etc.)
  supersetWith?: string;      // For supersets, name of exercise to superset with
}

// Weight tracking
export const weights = pgTable("weights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  weight: real("weight").notNull(),
  unit: text("unit").default("kg"),
  date: timestamp("date").notNull().defaultNow(),
});

// Create a base schema and then modify it to handle the date format issue
const baseWeightSchema = createInsertSchema(weights).omit({
  id: true,
  userId: true,
});

// Modified schema that accepts string dates and converts them to Date objects
export const insertWeightSchema = baseWeightSchema.extend({
  date: z.union([
    z.string().transform(dateStr => new Date(dateStr)),
    z.date()
  ])
});

export type InsertWeight = z.infer<typeof insertWeightSchema>;
export type Weight = typeof weights.$inferSelect;

// Nutrition goals
export const nutritionGoals = pgTable("nutrition_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  caloriesTarget: integer("calories_target").notNull(),
  proteinTarget: real("protein_target").notNull(),
  carbsTarget: real("carbs_target").notNull(),
  fatTarget: real("fat_target").notNull(),
});

export const insertNutritionGoalSchema = createInsertSchema(nutritionGoals).omit({
  id: true,
  userId: true,
});

export type InsertNutritionGoal = z.infer<typeof insertNutritionGoalSchema>;
export type NutritionGoal = typeof nutritionGoals.$inferSelect;

// Fitness Plans
export const fitnessPlans = pgTable("fitness_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  preferences: jsonb("preferences").notNull(),
  workoutPlan: jsonb("workout_plan").notNull(),
  mealPlan: jsonb("meal_plan").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deactivatedAt: timestamp("deactivated_at"),
  deactivationReason: text("deactivation_reason"),
});

export const insertFitnessPlanSchema = createInsertSchema(fitnessPlans).omit({
  id: true,
  userId: true,
});

export type InsertFitnessPlan = z.infer<typeof insertFitnessPlanSchema>;
export type FitnessPlan = typeof fitnessPlans.$inferSelect;

// System Settings
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;

// User Recommendation Settings
export const userRecommendations = pgTable("user_recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  lastRecommendationDate: date("last_recommendation_date"), // Tracks the last date recommendations were shown
  autoShowEnabled: boolean("auto_show_enabled").default(true).notNull(), // Whether to automatically show daily recommendations
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserRecommendationSchema = createInsertSchema(userRecommendations).omit({
  id: true,
  updatedAt: true,
});

export type InsertUserRecommendation = z.infer<typeof insertUserRecommendationSchema>;
export type UserRecommendation = typeof userRecommendations.$inferSelect;

export const userRecommendationsRelations = relations(userRecommendations, ({ one }: RelationFns) => ({
  user: one(users, {
    fields: [userRecommendations.userId],
    references: [users.id],
  }),
}));

// Password Reset Tokens
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Exercise Library
export const exerciseLibrary = pgTable("exercise_library", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  muscleGroup: text("muscle_group").notNull(), // e.g., "chest", "back", "legs", etc.
  difficulty: text("difficulty").notNull(), // e.g., "beginner", "intermediate", "advanced"
  videoUrl: text("video_url"), // URL to demonstration video
  imageUrl: text("image_url"), // URL to exercise image
  instructions: text("instructions").notNull(), // Step-by-step instructions
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertExerciseLibrarySchema = createInsertSchema(exerciseLibrary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExerciseLibrary = z.infer<typeof insertExerciseLibrarySchema>;
export type ExerciseLibrary = typeof exerciseLibrary.$inferSelect;

// Password reset token relations
export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

// Define all relations after all tables are defined
export const usersRelations = relations(users, ({ many }: RelationFns) => ({
  meals: many(meals),
  workouts: many(workouts),
  weights: many(weights),
  nutritionGoals: many(nutritionGoals),
  fitnessPlans: many(fitnessPlans),
  savedMeals: many(savedMeals),
  passwordResetTokens: many(passwordResetTokens),
  // Trainer-client relationships
  clientsAsTrainer: many(trainerClients, { relationName: "trainer" }),
  trainersAsClient: many(trainerClients, { relationName: "client" }),
  // Trainer-client request relationships
  clientRequestsAsTrainer: many(trainerClientRequests, { relationName: "requestTrainer" }),
  trainerRequestsAsClient: many(trainerClientRequests, { relationName: "requestClient" }),
  // Trainer-client messaging relationships
  messagesAsTrainer: many(trainerMessages, { relationName: "messageTrainer" }),
  messagesAsClient: many(trainerMessages, { relationName: "messageClient" }),
  messagesSent: many(trainerMessages, { relationName: "messageSender" }),
  // Trainer nutrition plans relationships
  nutritionPlansAsTrainer: many(trainerNutritionPlans, { relationName: "trainer" }),
  nutritionPlansAsClient: many(trainerNutritionPlans, { relationName: "client" }),
  // Trainer fitness plans relationships
  fitnessPlansAsTrainer: many(trainerFitnessPlans, { relationName: "trainer" }),
  fitnessPlansAsClient: many(trainerFitnessPlans, { relationName: "client" }),
}));

export const mealsRelations = relations(meals, ({ one }: RelationFns) => ({
  user: one(users, {
    fields: [meals.userId],
    references: [users.id],
  }),
}));

export const workoutsRelations = relations(workouts, ({ one, many }: RelationFns) => ({
  user: one(users, {
    fields: [workouts.userId],
    references: [users.id],
  }),
  exercises: many(exercises),
}));

export const exercisesRelations = relations(exercises, ({ one }: RelationFns) => ({
  workout: one(workouts, {
    fields: [exercises.workoutId],
    references: [workouts.id],
  }),
}));

export const weightsRelations = relations(weights, ({ one }: RelationFns) => ({
  user: one(users, {
    fields: [weights.userId],
    references: [users.id],
  }),
}));

export const nutritionGoalsRelations = relations(nutritionGoals, ({ one }: RelationFns) => ({
  user: one(users, {
    fields: [nutritionGoals.userId],
    references: [users.id],
  }),
}));

export const fitnessPlansRelations = relations(fitnessPlans, ({ one }: RelationFns) => ({
  user: one(users, {
    fields: [fitnessPlans.userId],
    references: [users.id],
  }),
}));

// Goals
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  category: text("category").notNull(), // weight, fitness, nutrition, health
  description: text("description"),
  targetDate: timestamp("target_date").notNull(),
  targetValue: real("target_value"),
  unit: text("unit"),
  completed: boolean("completed").default(false).notNull(),
  progress: integer("progress").default(0).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Create a base schema for goals
const baseGoalSchema = createInsertSchema(goals).omit({
  id: true,
  userId: true,
  createdAt: true,
});

// Modified schema that accepts string dates and converts them to Date objects
export const insertGoalSchema = baseGoalSchema.extend({
  targetDate: z.union([
    z.string().transform(dateStr => new Date(dateStr)),
    z.date()
  ])
});

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

export const goalsRelations = relations(goals, ({ one }: RelationFns) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
}));

// Meal Recipe Library
export const mealRecipes = pgTable("meal_recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  ingredients: text("ingredients").notNull(), // JSON string of ingredients
  instructions: text("instructions").notNull(), // Step-by-step cooking instructions
  prepTime: integer("prep_time").notNull(), // in minutes
  cookTime: integer("cook_time").notNull(), // in minutes
  calories: integer("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  imageUrl: text("image_url"), // URL to meal image
  budget: text("budget").default("medium"), // low, medium, high
  isPublic: boolean("is_public").default(true).notNull(),
  featured: boolean("featured").default(false).notNull(), // For daily featured recipes
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMealRecipeSchema = createInsertSchema(mealRecipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMealRecipe = z.infer<typeof insertMealRecipeSchema>;
export type MealRecipe = typeof mealRecipes.$inferSelect;

// User Saved Meals (personal meal library)
export const savedMeals = pgTable("saved_meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  servingSize: real("serving_size").notNull(),
  servingUnit: text("serving_unit").notNull(),
  calories: integer("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  sourceRecipeId: integer("source_recipe_id").references(() => mealRecipes.id), // Optional reference to original recipe
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSavedMealSchema = createInsertSchema(savedMeals).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSavedMeal = z.infer<typeof insertSavedMealSchema>;
export type SavedMeal = typeof savedMeals.$inferSelect;

export const savedMealsRelations = relations(savedMeals, ({ one }: RelationFns) => ({
  user: one(users, {
    fields: [savedMeals.userId],
    references: [users.id],
  }),
  sourceRecipe: one(mealRecipes, {
    fields: [savedMeals.sourceRecipeId],
    references: [mealRecipes.id],
  }),
}));

// Plan generation status tracking
export const planGenerationStatus = pgTable(
  "plan_generation_status",
  {
    userId: integer("user_id").primaryKey().notNull(),
    isGenerating: boolean("is_generating").notNull().default(false),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    // Progress tracking fields
    currentStep: integer("current_step").default(0),
    totalSteps: integer("total_steps").default(5),
    stepMessage: text("step_message"),
    estimatedTimeRemaining: integer("estimated_time_remaining"),
    // Failure tracking
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),
    // Step-by-step generation data storage (as JSON)
    dataJson: text("data_json"), // Stores generation data between steps
    inputJson: text("input_json"), // Stores coach input for reference between steps
    // Note: createdAt field removed as it's not in the actual database schema
  }
);

export type PlanGenerationStatus = typeof planGenerationStatus.$inferSelect;
export type InsertPlanGenerationStatus = typeof planGenerationStatus.$inferInsert;

export const planGenerationStatusRelations = relations(planGenerationStatus, ({ one }: RelationFns) => ({
  user: one(users, {
    fields: [planGenerationStatus.userId],
    references: [users.id],
  }),
}));