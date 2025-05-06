/**
 * Custom User Creation Script
 * 
 * This script creates a specific set of test accounts for development
 * Run with: `npx tsx utils/user-creation/createAzimUser.ts`
 * 
 * Users created:
 * - Regular user: username="Azim2", password="Azim124"
 * - Admin user: username="Admin22", password="Azim123"
 * 
 * IMPORTANT: This script should only be used in development environments.
 * DO NOT run in production as it creates accounts with known credentials.
 */

import { db } from "../../server/db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../../server/storage";
import { hashPassword } from "../../server/auth";

/**
 * Creates test users for a specific development purpose
 */
export async function createAzimUser() {
  console.log("Creating specific test users...");
  
  try {
    // Create regular user account
    const azimExists = await storage.getUserByUsername("Azim2");
    if (azimExists) {
      console.log("ℹ️ User Azim2 already exists, deleting...");
      await db.delete(users).where(eq(users.username, "Azim2"));
    }
    
    await storage.createUser({
      username: "Azim2",
      email: "azim2@example.com",
      password: await hashPassword("Azim124"),
      isAdmin: false,
      isApproved: true,
      registeredAt: new Date(),
    });
    
    console.log("✅ User created:");
    console.log("   Username: Azim2");
    console.log("   Password: Azim124");
    
    // Create admin account
    const adminExists = await storage.getUserByUsername("Admin22");
    if (adminExists) {
      console.log("ℹ️ User Admin22 already exists, deleting...");
      await db.delete(users).where(eq(users.username, "Admin22"));
    }
    
    await storage.createUser({
      username: "Admin22",
      email: "admin22@example.com",
      password: await hashPassword("Azim123"),
      isAdmin: true,
      isApproved: true,
      registeredAt: new Date(),
    });
    
    console.log("✅ Admin created:");
    console.log("   Username: Admin22");
    console.log("   Password: Azim123");
    
    console.log("\nTest user creation complete! You can now login with these credentials.");
    return true;
  } catch (error) {
    console.error("❌ Failed to create users:", error);
    return false;
  }
}

// Only run when executed directly
if (require.main === module) {
  createAzimUser()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}