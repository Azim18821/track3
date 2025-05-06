import { db } from "../server/db";
import { users } from "../shared/schema";
import { hashPassword } from "../server/auth";
import { eq } from "drizzle-orm";

async function resetPassword(username: string, newPassword: string) {
  try {
    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update the user's password
    const result = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, username))
      .returning({ id: users.id, username: users.username });
    
    if (result.length === 0) {
      console.error(`User '${username}' not found`);
      process.exit(1);
    }
    
    console.log(`Password for user '${username}' (ID: ${result[0].id}) has been reset.`);
    console.log(`New password is: ${newPassword}`);
  } catch (error) {
    console.error("Error resetting password:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Get username from command line argument
const username = process.argv[2];
const newPassword = process.argv[3] || "test123"; // Default password if not provided

if (!username) {
  console.error("Please provide a username as argument: npm run reset-password [username] [optional-password]");
  process.exit(1);
}

resetPassword(username, newPassword);