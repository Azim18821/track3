import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema";

// Define meals table here since we're creating a circular reference otherwise
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

// New table for meal items - multiple items can be associated with a single meal
export const mealItems = pgTable("meal_items", {
  id: serial("id").primaryKey(),
  mealId: integer("meal_id").notNull().references(() => meals.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  servingSize: real("serving_size").notNull(),
  servingUnit: text("serving_unit").notNull(),
  calories: integer("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Create insert schema for meal items
export const insertMealItemSchema = createInsertSchema(mealItems).omit({
  id: true,
  mealId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMealItem = z.infer<typeof insertMealItemSchema>;
export type MealItem = typeof mealItems.$inferSelect;

// Define relations between meal items and meals
export const mealItemsRelations = relations(mealItems, ({ one }) => ({
  meal: one(meals, {
    fields: [mealItems.mealId],
    references: [meals.id],
  }),
}));

// Define meal with related items
export interface MealWithItems {
  id: number;
  userId: number;
  name: string;
  mealType: string;
  date: Date | string;
  isPlanned: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: MealItem[];
}

// Schema for creating a meal with multiple items
export const createMealWithItemsSchema = z.object({
  name: z.string().min(1, "Meal name is required"),
  mealType: z.string().min(1, "Meal type is required"),
  date: z.union([z.string(), z.date()]).optional(),
  items: z.array(insertMealItemSchema).min(1, "At least one food item is required"),
});

export type CreateMealWithItems = z.infer<typeof createMealWithItemsSchema>;