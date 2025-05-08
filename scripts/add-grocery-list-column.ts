import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * Script to add grocery_list column to fitness_plans table
 */
async function addGroceryListColumn() {
  try {
    // Check if grocery_list column exists
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'fitness_plans' AND column_name = 'grocery_list'
    `);
    
    const rows = result.rows;
    
    if (rows.length === 0) {
      console.log("Adding grocery_list column to fitness_plans table...");
      
      // Add grocery_list column
      await db.execute(sql`
        ALTER TABLE fitness_plans 
        ADD COLUMN IF NOT EXISTS grocery_list JSONB
      `);
      
      console.log("Added grocery_list column successfully");
      
      // Check if other columns exist and add them if needed
      const columns = [
        { name: 'nutrition_data', type: 'JSONB' },
        { name: 'summary', type: 'JSONB' }, 
        { name: 'weekly_budget', type: 'REAL' },
        { name: 'budget_currency', type: 'TEXT', default: "'GBP'" },
        { name: 'actual_cost', type: 'REAL' }
      ];
      
      for (const column of columns) {
        const columnResult = await db.execute(sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'fitness_plans' AND column_name = ${column.name}
        `);
        
        if (columnResult.rows.length === 0) {
          console.log(`Adding ${column.name} column to fitness_plans table...`);
          
          let alterSql = `ALTER TABLE fitness_plans ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`;
          
          if (column.default) {
            alterSql += ` DEFAULT ${column.default}`;
          }
          
          await db.execute(sql.raw(alterSql));
          
          console.log(`Added ${column.name} column successfully`);
        }
      }
    } else {
      console.log("grocery_list column already exists");
    }
    
    console.log("Database migration completed successfully");
  } catch (error) {
    console.error("Error executing migration:", error);
  } finally {
    process.exit(0);
  }
}

// Run the migration
addGroceryListColumn().catch(console.error);