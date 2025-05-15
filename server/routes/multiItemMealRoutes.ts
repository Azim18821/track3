import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  meals, 
  mealItems, 
  createMealWithItemsSchema 
} from '../../shared/schema.meal-items';
import { eq } from 'drizzle-orm';

const router = Router();

// Add a multi-item meal
router.post('/multi-item-meal', async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = req.user.id;

    // Log the received request body for debugging
    console.log('Received meal data:', JSON.stringify(req.body, null, 2));
    
    // The client should now be sending data in the correct format,
    // but we'll still handle both formats for backward compatibility
    const adaptedData = req.body.items 
      ? req.body // Already in the correct format with 'name' and 'items'
      : {
          // Convert from old format with 'mealName' and 'foodItems'
          name: req.body.mealName,
          mealType: req.body.mealType,
          date: req.body.date,
          items: req.body.foodItems?.map((item: any) => ({
            name: item.name,
            servingSize: item.servingSize,
            servingUnit: item.servingUnit,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat
          })) || []
        };

    // Validate the adapted data
    const validationResult = createMealWithItemsSchema.safeParse(adaptedData);

    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid meal data', 
        errors: validationResult.error.format() 
      });
    }

    const { name, mealType, date, items } = validationResult.data;

    // Enhanced date handling with better validation and error handling
    let mealDate;
    try {
      // If date is provided, try to parse it with multiple methods
      if (date) {
        console.log(`Received date value: ${date}, type: ${typeof date}`);
        
        // First try direct Date object creation
        mealDate = new Date(date);
        
        // If that fails, try ISO format conversion
        if (isNaN(mealDate.getTime())) {
          console.warn(`Initial date parsing failed, trying alternative methods`);
          
          // Try parsing as ISO string if it's a string with T separator
          if (typeof date === 'string' && date.includes('T')) {
            const [datePart] = date.split('T');
            mealDate = new Date(datePart);
          }
          
          // If still invalid, use current date
          if (isNaN(mealDate.getTime())) {
            console.error(`Could not parse date "${date}" using any method`);
            mealDate = new Date();
          }
        }
      } else {
        // No date provided, use current date
        mealDate = new Date();
      }
      
      // Final validity check and logging
      if (isNaN(mealDate.getTime())) {
        console.error(`Final date validation failed, using current date`);
        mealDate = new Date();
      }
      
      console.log(`Final meal date used: ${mealDate.toISOString()}`);
    } catch (err) {
      console.error(`Unexpected error in date processing:`, err);
      mealDate = new Date(); // Use current date as fallback
    }
    
    // Calculate total nutrition values from all items
    const totalNutrition = items.reduce((totals, item) => {
      return {
        calories: totals.calories + (item.calories || 0),
        protein: totals.protein + (item.protein || 0),
        carbs: totals.carbs + (item.carbs || 0),
        fat: totals.fat + (item.fat || 0)
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // Create the parent meal record with aggregated nutrition values
    const [mealResult] = await db.insert(meals).values({
      userId: userId,
      name: name,
      mealType: mealType,
      date: mealDate,
      servingSize: 1, // The meal itself is treated as 1 serving
      servingUnit: 'meal',
      calories: totalNutrition.calories,
      protein: totalNutrition.protein,
      carbs: totalNutrition.carbs,
      fat: totalNutrition.fat,
      isPlanned: false, // User manually logged this meal
    }).returning({ id: meals.id });

    if (!mealResult || !mealResult.id) {
      throw new Error('Failed to create meal record');
    }

    const mealId = mealResult.id;

    // Create individual meal item records
    const mealItemInserts = items.map(item => ({
      mealId: mealId,
      name: item.name,
      servingSize: item.servingSize,
      servingUnit: item.servingUnit,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
    }));

    // Insert all meal items
    const itemResults = await db.insert(mealItems).values(mealItemInserts).returning();

    // Return success response with the created meal and items
    return res.status(201).json({
      message: 'Meal with items added successfully',
      meal: {
        id: mealId,
        name: name,
        mealType: mealType,
        date: mealDate,
        totalNutrition,
        itemCount: items.length
      }
    });
  } catch (error) {
    console.error('Error adding multi-item meal:', error);
    return res.status(500).json({ 
      message: 'Failed to add meal', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get a meal with its items
router.get('/meals/:mealId/items', async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = req.user.id;
    const mealId = parseInt(req.params.mealId);

    if (isNaN(mealId)) {
      return res.status(400).json({ message: 'Invalid meal ID' });
    }

    // Get the meal record
    const mealRecord = await db.select()
      .from(meals)
      .where(eq(meals.id, mealId))
      .then(results => results[0]);

    if (!mealRecord) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    // Ensure the meal belongs to the requesting user
    if (mealRecord.userId !== userId) {
      return res.status(403).json({ message: 'You do not have permission to view this meal' });
    }

    // Get all meal items
    const mealItemRecords = await db.select()
      .from(mealItems)
      .where(eq(mealItems.mealId, mealId));

    // Return the meal with its items
    return res.status(200).json({
      meal: mealRecord,
      items: mealItemRecords
    });
  } catch (error) {
    console.error('Error fetching meal items:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch meal items', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;