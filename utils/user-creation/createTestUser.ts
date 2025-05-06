/**
 * Test User Creation Utility
 * 
 * This script creates test users for development purposes.
 * Run with: `npx tsx server/createTestUser.ts`
 * 
 * Users created:
 * - Regular user: username="user2", password="password"
 * - Admin user: username="admin2", password="password"
 * 
 * IMPORTANT: This script should only be used in development environments.
 * DO NOT run in production as it creates accounts with known credentials.
 */

import { storage } from "../../server/storage";
import { hashPassword } from "../../server/auth";

interface TestUserConfig {
  username: string;
  email: string;
  isAdmin: boolean;
}

// Test users configuration
const TEST_USERS: TestUserConfig[] = [
  {
    username: "user2",
    email: "user2@example.com",
    isAdmin: false
  },
  {
    username: "admin2",
    email: "admin2@example.com",
    isAdmin: true
  }
];

// Default password for all test accounts
const TEST_PASSWORD = "password";

/**
 * Creates test users for development purposes
 */
export async function createTestUsers() {
  console.log("Creating test users for development...");
  
  try {
    // Track how many users were created
    let created = 0;
    
    // Process each test user in the configuration
    for (const userConfig of TEST_USERS) {
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userConfig.username);
      
      if (!existingUser) {
        // Create the user
        await storage.createUser({
          username: userConfig.username,
          email: userConfig.email,
          password: await hashPassword(TEST_PASSWORD),
          isAdmin: userConfig.isAdmin,
          isApproved: true, // All test users are pre-approved
          registeredAt: new Date(),
        });
        
        console.log(`✅ Created ${userConfig.isAdmin ? 'admin' : 'user'}: ${userConfig.username}`);
        created++;
      } else {
        console.log(`ℹ️ User ${userConfig.username} already exists, skipping`);
      }
    }
    
    console.log(`\nTest users setup complete: ${created} users created, ${TEST_USERS.length - created} already existed.`);
    console.log(`You can login with any of these usernames and password: "${TEST_PASSWORD}"`);
    
    return true;
  } catch (error) {
    console.error("❌ Failed to create test users:", error);
    return false;
  }
}

// Only run when executed directly
if (require.main === module) {
  createTestUsers()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}