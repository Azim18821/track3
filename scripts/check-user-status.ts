/**
 * Script to check a user's onboarding status and profile data
 */

import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkUserStatus(username: string) {
  try {
    // Find user by username
    const [user] = await db.select().from(users).where(eq(users.username, username));
    
    if (!user) {
      console.error(`User ${username} not found.`);
      return;
    }
    
    console.log('User details:');
    console.log('=============');
    console.log(`ID: ${user.id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Email: ${user.email}`);
    console.log(`Roles: ${user.isAdmin ? 'Admin' : ''} ${user.isTrainer ? 'Trainer' : ''} ${user.isApproved ? 'Approved' : 'Not Approved'}`);
    console.log('\nOnboarding Status:');
    console.log('=================');
    
    const isOnboardingComplete = Boolean(
      user.fitnessGoal &&
      user.bodyType &&
      user.height &&
      user.weight && 
      user.gender
    );
    
    console.log(`Onboarding Complete: ${isOnboardingComplete ? 'Yes' : 'No'}`);
    console.log(`Fitness Goal: ${user.fitnessGoal || 'Not set'}`);
    console.log(`Body Type: ${user.bodyType || 'Not set'}`);
    console.log(`Height: ${user.height ? `${user.height} ${user.heightUnit || 'cm'}` : 'Not set'}`);
    console.log(`Weight: ${user.weight ? `${user.weight} ${user.weightUnit || 'kg'}` : 'Not set'}`);
    console.log(`Gender: ${user.gender || 'Not set'}`);
    console.log(`Date of Birth: ${user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not set'}`);
    
    console.log('\nAI Analysis:');
    console.log('===========');
    if (user.aiAnalysis) {
      try {
        const analysis = JSON.parse(user.aiAnalysis);
        console.log(`Timeframe: ${analysis.timeframe || 'Not available'}`);
        console.log(`Description: ${analysis.description || 'Not available'}`);
        console.log('Recommendations:');
        if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
          analysis.recommendations.forEach((rec: string, index: number) => {
            console.log(`  ${index + 1}. ${rec}`);
          });
        } else {
          console.log('  No recommendations available');
        }
      } catch (e) {
        console.log('Unable to parse AI analysis data');
      }
    } else {
      console.log('No AI analysis data available');
    }
    
  } catch (error) {
    console.error('Error checking user status:', error);
  } finally {
    process.exit(0);
  }
}

// Get command line arguments
const username = process.argv[2];

if (!username) {
  console.log('Usage: tsx scripts/check-user-status.ts <username>');
  process.exit(1);
}

checkUserStatus(username);