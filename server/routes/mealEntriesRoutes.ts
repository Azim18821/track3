import { Router, Request, Response } from 'express';
import { db } from '../db';
import { ensureAuthenticated } from '../auth';
import { z } from 'zod';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { mealEntries, mealItems } from '../../shared/schema';
import { InsertMealEntry, InsertMealItem } from '../../shared/schema';

const router = Router();

// Define validation schemas
const mealItemSchema = z.object({
  foodName: z.string().min(1, "Food name is required"),
  servingSize: z.number().positive("Serving size must be positive"),
  servingUnit: z.string().min(1, "Serving unit is required"),
  calories: z.number().nonnegative("Calories cannot be negative"),
  protein: z.number().nonnegative("Protein cannot be negative"),
  carbs: z.number().nonnegative("Carbs cannot be negative"),
  fat: z.number().nonnegative("Fat cannot be negative"),
  sourceFoodId: z.number().optional(),
});

const mealEntrySchema = z.object({
  name: z.string().min(1, "Meal name is required"),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  date: z.string().refine(val => {
    try {
      parseISO(val);
      return true;
    } catch (e) {
      return false;
    }
  }, "Invalid date format"),
  notes: z.string().optional(),
  isPlanned: z.boolean(),
  items: z.array(mealItemSchema).min(1, "At least one food item is required"),
});

// Get meal entries for a specific date (with their items)
router.get('/', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const userId = req.user!.id;

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const parsedDate = parseISO(date);
    const dayStart = startOfDay(parsedDate);
    const dayEnd = endOfDay(parsedDate);

    // First get the meal entries
    const mealEntriesResult = await db.query.mealEntries.findMany({
      where: and(
        eq(mealEntries.userId, userId),
        gte(mealEntries.date, dayStart),
        lte(mealEntries.date, dayEnd)
      ),
      orderBy: [mealEntries.date]
    });

    // For each meal entry, get the meal items
    const entriesWithItems = await Promise.all(
      mealEntries.map(async (entry) => {
        const items = await db.query.mealItemsTbl.findMany({
          where: eq(mealItemsTbl.mealEntryId, entry.id!)
        });
        
        return {
          ...entry,
          items
        };
      })
    );

    return res.json(entriesWithItems);
  } catch (error) {
    console.error('Error fetching meal entries:', error);
    return res.status(500).json({ error: 'Failed to fetch meal entries' });
  }
});

// Get meal entry history with pagination
router.get('/history', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '10');
    const offset = (page - 1) * limit;

    // Count total entries
    const countResult = await db.select({ count: sql`count(*)` })
      .from(mealEntriesTbl)
      .where(eq(mealEntriesTbl.userId, userId));
      
    const total = Number(countResult[0].count);

    // Get paginated entries
    const mealEntries = await db.query.mealEntriesTbl.findMany({
      where: eq(mealEntriesTbl.userId, userId),
      orderBy: [sql`${mealEntriesTbl.date} DESC`],
      limit,
      offset
    });

    // For each meal entry, get the meal items
    const entriesWithItems = await Promise.all(
      mealEntries.map(async (entry) => {
        const items = await db.query.mealItemsTbl.findMany({
          where: eq(mealItemsTbl.mealEntryId, entry.id!)
        });
        
        return {
          ...entry,
          items
        };
      })
    );

    return res.json({
      entries: entriesWithItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching meal history:', error);
    return res.status(500).json({ error: 'Failed to fetch meal history' });
  }
});

// Create a new meal entry with items
router.post('/', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const validationResult = mealEntrySchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationResult.error.format() 
      });
    }
    
    const userId = req.user!.id;
    const { name, mealType, date, notes, isPlanned, items } = validationResult.data;
    
    // Begin a transaction to ensure all operations succeed or fail together
    const result = await db.transaction(async (tx) => {
      // Insert the meal entry
      const [mealEntry] = await tx.insert(mealEntriesTbl).values({
        userId,
        name,
        mealType,
        date: new Date(date),
        notes,
        isPlanned
      }).returning();
      
      if (!mealEntry || !mealEntry.id) {
        throw new Error('Failed to create meal entry');
      }
      
      // Insert all meal items
      const mealItemsWithEntryId = items.map(item => ({
        mealEntryId: mealEntry.id!,
        ...item
      }));
      
      const mealItems = await tx.insert(mealItemsTbl).values(mealItemsWithEntryId).returning();
      
      return {
        ...mealEntry,
        items: mealItems
      };
    });
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error creating meal entry:', error);
    return res.status(500).json({ error: 'Failed to create meal entry' });
  }
});

// Update an existing meal entry
router.put('/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const mealId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    if (isNaN(mealId)) {
      return res.status(400).json({ error: 'Invalid meal ID' });
    }
    
    // Check if the meal exists and belongs to this user
    const existingMeal = await db.query.mealEntriesTbl.findFirst({
      where: and(
        eq(mealEntriesTbl.id, mealId),
        eq(mealEntriesTbl.userId, userId)
      )
    });
    
    if (!existingMeal) {
      return res.status(404).json({ error: 'Meal entry not found' });
    }
    
    const validationResult = mealEntrySchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationResult.error.format() 
      });
    }
    
    const { name, mealType, date, notes, isPlanned, items } = validationResult.data;
    
    // Begin a transaction to ensure all operations succeed or fail together
    const result = await db.transaction(async (tx) => {
      // Update the meal entry
      const [updatedMeal] = await tx.update(mealEntriesTbl)
        .set({
          name,
          mealType,
          date: new Date(date),
          notes,
          isPlanned
        })
        .where(and(
          eq(mealEntriesTbl.id, mealId),
          eq(mealEntriesTbl.userId, userId)
        ))
        .returning();
      
      if (!updatedMeal) {
        throw new Error('Failed to update meal entry');
      }
      
      // Delete existing meal items for this entry
      await tx.delete(mealItemsTbl)
        .where(eq(mealItemsTbl.mealEntryId, mealId));
      
      // Insert all new meal items
      const mealItemsWithEntryId = items.map(item => ({
        mealEntryId: mealId,
        ...item
      }));
      
      const mealItems = await tx.insert(mealItemsTbl)
        .values(mealItemsWithEntryId)
        .returning();
      
      return {
        ...updatedMeal,
        items: mealItems
      };
    });
    
    return res.json(result);
  } catch (error) {
    console.error('Error updating meal entry:', error);
    return res.status(500).json({ error: 'Failed to update meal entry' });
  }
});

// Delete a meal entry
router.delete('/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const mealId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    if (isNaN(mealId)) {
      return res.status(400).json({ error: 'Invalid meal ID' });
    }
    
    // Check if the meal exists and belongs to this user
    const existingMeal = await db.query.mealEntriesTbl.findFirst({
      where: and(
        eq(mealEntriesTbl.id, mealId),
        eq(mealEntriesTbl.userId, userId)
      )
    });
    
    if (!existingMeal) {
      return res.status(404).json({ error: 'Meal entry not found' });
    }
    
    // Begin a transaction to ensure all operations succeed or fail together
    await db.transaction(async (tx) => {
      // Delete all meal items for this entry
      await tx.delete(mealItemsTbl)
        .where(eq(mealItemsTbl.mealEntryId, mealId));
      
      // Delete the meal entry
      await tx.delete(mealEntriesTbl)
        .where(and(
          eq(mealEntriesTbl.id, mealId),
          eq(mealEntriesTbl.userId, userId)
        ));
    });
    
    return res.json({ success: true, message: 'Meal entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting meal entry:', error);
    return res.status(500).json({ error: 'Failed to delete meal entry' });
  }
});

export default router;