import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema";

// ===========================
// Trainer-Client Relationship
// ===========================

export const trainerClients = pgTable("trainer_clients", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientId: integer("client_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  notes: text("notes"),
  status: text("status").default("active").notNull(), // active, paused, terminated
});

export const trainerClientsRelations = relations(trainerClients, ({ one }) => ({
  trainer: one(users, { fields: [trainerClients.trainerId], references: [users.id] }),
  client: one(users, { fields: [trainerClients.clientId], references: [users.id] }),
}));

export const insertTrainerClientSchema = createInsertSchema(trainerClients).omit({
  id: true,
  assignedAt: true,
});

export type InsertTrainerClient = z.infer<typeof insertTrainerClientSchema>;
export type TrainerClient = typeof trainerClients.$inferSelect;

// ===========================
// Plan Templates
// ===========================

export const planTemplates = pgTable("plan_templates", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // fitness, nutrition, combined
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  workoutPlan: jsonb("workout_plan"),
  nutritionTargets: jsonb("nutrition_targets"),
});

export const planTemplatesRelations = relations(planTemplates, ({ one }) => ({
  trainer: one(users, { fields: [planTemplates.trainerId], references: [users.id] }),
}));

export const insertPlanTemplateSchema = createInsertSchema(planTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlanTemplate = z.infer<typeof insertPlanTemplateSchema>;
export type PlanTemplate = typeof planTemplates.$inferSelect;

// ===========================
// Client Plans (Applied templates)
// ===========================

export const clientPlans = pgTable("client_plans", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  trainerId: integer("trainer_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  templateId: integer("template_id").references(() => planTemplates.id, { onDelete: 'set null' }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // fitness, nutrition, combined
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: text("status").default("active").notNull(), // draft, active, completed, cancelled
  workoutPlan: jsonb("workout_plan"),
  nutritionTargets: jsonb("nutrition_targets"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const clientPlansRelations = relations(clientPlans, ({ one }) => ({
  client: one(users, { fields: [clientPlans.clientId], references: [users.id] }),
  trainer: one(users, { fields: [clientPlans.trainerId], references: [users.id] }),
  template: one(planTemplates, { fields: [clientPlans.templateId], references: [planTemplates.id] }),
}));

export const insertClientPlanSchema = createInsertSchema(clientPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientPlan = z.infer<typeof insertClientPlanSchema>;
export type ClientPlan = typeof clientPlans.$inferSelect;