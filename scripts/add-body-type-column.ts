import { db, pool } from '../server/db';

async function addBodyTypeColumnToUsers() {
  try {
    console.log("Adding body_type column to users table...");
    
    // Check if column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'body_type';
    `;
    
    const checkResult = await pool.query(checkColumnQuery);
    
    if (checkResult.rows.length > 0) {
      console.log("Column 'body_type' already exists in users table.");
      return;
    }
    
    // Add the column if it doesn't exist
    const alterTableQuery = `
      ALTER TABLE users
      ADD COLUMN body_type TEXT;
    `;
    
    await pool.query(alterTableQuery);
    console.log("Successfully added 'body_type' column to users table.");
    
  } catch (error) {
    console.error("Error adding body_type column:", error);
    throw error;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the migration
addBodyTypeColumnToUsers()
  .then(() => {
    console.log("Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });