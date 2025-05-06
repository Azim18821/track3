/**
 * Script to reset a user's onboarding status
 * Can either complete onboarding with default values or reset it to start over
 */

import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function resetUserOnboarding(username: string, action: 'complete' | 'reset') {
  try {
    // Find user by username
    const [user] = await db.select().from(users).where(eq(users.username, username));
    
    if (!user) {
      console.error(`User ${username} not found.`);
      return;
    }
    
    console.log(`Found user: ${user.username} (ID: ${user.id})`);
    
    if (action === 'reset') {
      // Reset onboarding fields to null
      await db.update(users)
        .set({
          fitnessGoal: null,
          bodyType: null,
          height: null,
          weight: null,
          heightUnit: 'cm',
          weightUnit: 'kg',
          gender: null,
          dateOfBirth: null,
          aiAnalysis: null
        })
        .where(eq(users.id, user.id));
      
      console.log(`Reset onboarding data for user ${username}`);
    } else {
      // Set default values to complete onboarding
      await db.update(users)
        .set({
          fitnessGoal: 'weightLoss',
          bodyType: 'mesomorph',
          height: 175,
          weight: 70,
          heightUnit: 'cm',
          weightUnit: 'kg',
          gender: 'male',
          dateOfBirth: new Date('1990-01-01'), // Using Date object for timestamp field
          aiAnalysis: JSON.stringify({
            timeframe: "8-12 weeks",
            description: "You're in a good position to achieve your fitness goals with proper dedication.",
            recommendations: [
              "Follow a balanced diet with proper nutrition",
              "Exercise regularly with a mix of cardio and strength training",
              "Stay consistent with your routine",
              "Get adequate rest and recovery",
              "Track your progress regularly"
            ]
          })
        })
        .where(eq(users.id, user.id));
      
      console.log(`Completed onboarding for user ${username} with default values`);
    }
    
  } catch (error) {
    console.error('Error updating user onboarding status:', error);
  } finally {
    process.exit(0);
  }
}

// Get command line arguments
const username = process.argv[2];
const action = process.argv[3] as 'complete' | 'reset';

if (!username || !['complete', 'reset'].includes(action)) {
  console.log('Usage: tsx scripts/reset-onboarding.ts <username> <complete|reset>');
  process.exit(1);
}

resetUserOnboarding(username, action);