import { Router } from 'express';
import { db } from '../db';
import { mealEntries, mealItems } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { ensureAuthenticated } from '../auth';
import { z } from 'zod';

const router = Router();

// Validation schema for meal entry with items
const mealEntryWithItemsSchema = z.object({
  name: z.string().min(1, "Meal name is required"),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  date: z.coerce.date(),
  notes: z.string().optional(),
  isPlanned: z.boolean().default(false),
  items: z.array(z.object({
    foodName: z.string().min(1, "Food name is required"),
    servingSize: z.number().positive("Serving size must be positive"),
    servingUnit: z.string().min(1, "Serving unit is required"),
    calories: z.number().nonnegative("Calories cannot be negative"),
    protein: z.number().nonnegative("Protein cannot be negative"),
    carbs: z.number().nonnegative("Carbs cannot be negative"),
    fat: z.number().nonnegative("Fat cannot be negative"),
    sourceFoodId: z.number().optional()
  })).min(1, "At least one food item is required")
});

// Get meal entries for a specific date
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = req.query.date as string;
    
    // Get the date range (start of day to end of day)
    let startDate: Date, endDate: Date;
    
    if (dateParam) {
      // Parse the date and set time to start of day
      startDate = new Date(dateParam);
      startDate.setUTCHours(0, 0, 0, 0);
      
      // End of day
      endDate = new Date(startDate);
      endDate.setUTCHours(23, 59, 59, 999);
    } else {
      // Default to today
      startDate = new Date();
      startDate.setUTCHours(0, 0, 0, 0);
      
      endDate = new Date(startDate);
      endDate.setUTCHours(23, 59, 59, 999);
    }
    
    // Query for meal entries
    const entries = await db.select()
      .from(mealEntries)
      .where(
        and(
          eq(mealEntries.userId, userId),
          sql`${mealEntries.date} >= ${startDate}`,
          sql`${mealEntries.date} <= ${endDate}`
        )
      )
      .orderBy(mealEntries.date);
    
    // For each entry, get the associated items
    const entriesWithItems = await Promise.all(entries.map(async (entry) => {
      const items = await db.select()
        .from(mealItems)
        .where(eq(mealItems.mealEntryId, entry.id))
        .orderBy(mealItems.createdAt);
      
      return {
        ...entry,
        items
      };
    }));
    
    return res.status(200).json(entriesWithItems);
  } catch (error) {
    console.error('Error fetching meal entries:', error);
    return res.status(500).json({ message: 'Failed to fetch meal entries' });
  }
});

// Create a new meal entry with items
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate request data
    const validationResult = mealEntryWithItemsSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid meal entry data', 
        errors: validationResult.error.format() 
      });
    }
    
    const data = validationResult.data;
    
    // Start a transaction to ensure all operations succeed or fail together
    return await db.transaction(async (tx) => {
      // Create the meal entry
      const [mealEntry] = await tx.insert(mealEntries)
        .values({
          userId,
          name: data.name,
          mealType: data.mealType,
          date: data.date,
          notes: data.notes,
          isPlanned: data.isPlanned
        })
        .returning();
      
      // Create each meal item linked to the entry
      const mealItemsData = data.items.map(item => ({
        mealEntryId: mealEntry.id,
        foodName: item.foodName,
        servingSize: item.servingSize,
        servingUnit: item.servingUnit,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        sourceFoodId: item.sourceFoodId
      }));
      
      const items = await tx.insert(mealItems)
        .values(mealItemsData)
        .returning();
      
      return res.status(201).json({
        message: 'Meal entry created successfully',
        mealEntry: {
          ...mealEntry,
          items
        }
      });
    });
  } catch (error) {
    console.error('Error creating meal entry:', error);
    return res.status(500).json({ message: 'Failed to create meal entry' });
  }
});

// Update an existing meal entry
router.put('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const entryId = parseInt(req.params.id);
    
    if (isNaN(entryId)) {
      return res.status(400).json({ message: 'Invalid meal entry ID' });
    }
    
    // Validate request data
    const validationResult = mealEntryWithItemsSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid meal entry data', 
        errors: validationResult.error.format() 
      });
    }
    
    const data = validationResult.data;
    
    // Verify ownership
    const existingEntry = await db.select()
      .from(mealEntries)
      .where(
        and(
          eq(mealEntries.id, entryId),
          eq(mealEntries.userId, userId)
        )
      )
      .then(results => results[0]);
    
    if (!existingEntry) {
      return res.status(404).json({ message: 'Meal entry not found or access denied' });
    }
    
    // Start a transaction to ensure all operations succeed or fail together
    return await db.transaction(async (tx) => {
      // Update the meal entry
      const [updatedEntry] = await tx.update(mealEntries)
        .set({
          name: data.name,
          mealType: data.mealType,
          date: data.date,
          notes: data.notes,
          isPlanned: data.isPlanned
        })
        .where(eq(mealEntries.id, entryId))
        .returning();
      
      // Delete all existing items
      await tx.delete(mealItems)
        .where(eq(mealItems.mealEntryId, entryId));
      
      // Create new items
      const mealItemsData = data.items.map(item => ({
        mealEntryId: entryId,
        foodName: item.foodName,
        servingSize: item.servingSize,
        servingUnit: item.servingUnit,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        sourceFoodId: item.sourceFoodId
      }));
      
      const items = await tx.insert(mealItems)
        .values(mealItemsData)
        .returning();
      
      return res.status(200).json({
        message: 'Meal entry updated successfully',
        mealEntry: {
          ...updatedEntry,
          items
        }
      });
    });
  } catch (error) {
    console.error('Error updating meal entry:', error);
    return res.status(500).json({ message: 'Failed to update meal entry' });
  }
});

// Delete a meal entry
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const entryId = parseInt(req.params.id);
    
    if (isNaN(entryId)) {
      return res.status(400).json({ message: 'Invalid meal entry ID' });
    }
    
    // Verify ownership
    const existingEntry = await db.select()
      .from(mealEntries)
      .where(
        and(
          eq(mealEntries.id, entryId),
          eq(mealEntries.userId, userId)
        )
      )
      .then(results => results[0]);
    
    if (!existingEntry) {
      return res.status(404).json({ message: 'Meal entry not found or access denied' });
    }
    
    // Note: Due to CASCADE delete in the schema, deleting the meal entry will also delete all associated items
    await db.delete(mealEntries)
      .where(eq(mealEntries.id, entryId));
    
    return res.status(200).json({ message: 'Meal entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting meal entry:', error);
    return res.status(500).json({ message: 'Failed to delete meal entry' });
  }
});

// Get all meal entries for a user (with pagination)
router.get('/history', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    // Query for meal entries with pagination
    const entries = await db.select()
      .from(mealEntries)
      .where(eq(mealEntries.userId, userId))
      .orderBy(desc(mealEntries.date))
      .limit(limit)
      .offset(offset);
    
    // For each entry, get the associated items
    const entriesWithItems = await Promise.all(entries.map(async (entry) => {
      const items = await db.select()
        .from(mealItems)
        .where(eq(mealItems.mealEntryId, entry.id))
        .orderBy(mealItems.createdAt);
      
      return {
        ...entry,
        items
      };
    }));
    
    // Get total count for pagination
    const [{ count }] = await db.select({
      count: sql<number>`count(*)`
    })
    .from(mealEntries)
    .where(eq(mealEntries.userId, userId));
    
    return res.status(200).json({
      entries: entriesWithItems,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching meal history:', error);
    return res.status(500).json({ message: 'Failed to fetch meal history' });
  }
});

export default router;