/**
 * Simple User Creation Script
 * 
 * This script creates a single test account for development
 * Run with: `npx tsx utils/user-creation/createAzim3User.ts`
 * 
 * User created:
 * - Regular user: username="Azim3", password="Azim124"
 * 
 * IMPORTANT: This script should only be used in development environments.
 * DO NOT run in production as it creates an account with known credentials.
 */

import { storage } from "../../server/storage";
import { hashPassword } from "../../server/auth";

/**
 * Creates a single test user for development
 */
export async function createAzim3User() {
  console.log("Creating test user Azim3...");
  
  try {
    // Check if user already exists
    const existingUser = await storage.getUserByUsername("Azim3");
    
    if (existingUser) {
      console.log("ℹ️ User Azim3 already exists!");
      return false;
    }
    
    // Create the user
    await storage.createUser({
      username: "Azim3",
      email: "azim3@example.com",
      password: await hashPassword("Azim124"),
      isAdmin: false,
      isApproved: true,
      registeredAt: new Date(),
    });
    
    console.log("✅ User created successfully:");
    console.log("   Username: Azim3");
    console.log("   Password: Azim124");
    return true;
  } catch (error) {
    console.error("❌ Failed to create Azim3 user:", error);
    return false;
  }
}

// Only run when executed directly
if (require.main === module) {
  createAzim3User()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}