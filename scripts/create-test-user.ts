import { db } from "../server/db";
import { users } from "../shared/schema";
import { hashPassword } from "../server/auth";
import { eq } from "drizzle-orm";

async function createTestUser(username: string, password: string) {
  try {
    console.log("Database connection initialized");
    
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.username, username));
    
    if (existingUser.length > 0) {
      console.log(`User '${username}' already exists with ID: ${existingUser[0].id}`);
      process.exit(0);
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Insert the new user
    const result = await db
      .insert(users)
      .values({
        username: username,
        password: hashedPassword,
        email: `${username}@example.com`,
        isAdmin: false,
        isTrainer: false,
        approved: true
      })
      .returning();
    
    console.log(`Created new user '${username}' with ID: ${result[0].id}`);
    console.log(`Password: ${password}`);
    
  } catch (error) {
    console.error("Error creating user:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Get username and password from command line arguments
const username = process.argv[2] || "testuser";
const password = process.argv[3] || "test123"; // Default password if not provided

createTestUser(username, password);