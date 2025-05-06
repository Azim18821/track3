import { User } from '@/types/user';

/**
 * Checks if a user has completed the onboarding process
 * @param user User object to check
 * @returns boolean indicating if onboarding is complete
 */
export function hasCompletedOnboarding(user: User | null): boolean {
  if (!user) return false;
  
  // Check if essential onboarding data is present
  // For the most complete experience, user should have both basic profile data
  // and AI analysis, but we can consider onboarding complete with just the basic data
  const hasBasicProfileData = Boolean(
    user.fitnessGoal &&
    user.bodyType &&
    user.height &&
    user.weight && 
    user.gender
  );
  
  // Check if AI analysis is also present (preferred but not required)
  const hasAnalysis = Boolean(user.aiAnalysis);
  
  return hasBasicProfileData;
}

/**
 * Extracts and parses AI analysis data from the user object
 * @param user User object containing analysis data
 * @returns Parsed analysis object or null if not available
 */
export function getUserAnalysis(user: User | null) {
  if (!user || !user.aiAnalysis) return null;
  
  try {
    // Try to parse the analysis JSON
    return JSON.parse(user.aiAnalysis);
  } catch (error) {
    console.error('Error parsing user aiAnalysis:', error);
    return null;
  }
}

/**
 * Creates a human-readable summary of the user's fitness profile
 * @param user User object containing profile data
 * @returns String summary of the user's profile
 */
export function createUserProfileSummary(user: User | null): string {
  if (!user) return 'Profile information not available';
  
  const parts = [];
  
  if (user.fitnessGoal) {
    // Clean up the goal format
    let goal = user.fitnessGoal;
    // If the goal has a pipe character, it's storing additional data, so strip it out
    if (goal.includes('|')) {
      goal = goal.split('|')[0];
    }
    // Format goal name
    goal = goal.charAt(0).toUpperCase() + goal.slice(1).replace(/([A-Z])/g, ' $1').trim();
    parts.push(`Goal: ${goal}`);
  }
  
  if (user.bodyType) {
    const bodyType = user.bodyType.charAt(0).toUpperCase() + user.bodyType.slice(1);
    parts.push(`Body Type: ${bodyType}`);
  }
  
  if (user.height && user.heightUnit) {
    parts.push(`Height: ${user.height} ${user.heightUnit}`);
  }
  
  if (user.weight && user.weightUnit) {
    parts.push(`Weight: ${user.weight} ${user.weightUnit}`);
  }
  
  if (user.gender) {
    const gender = user.gender.charAt(0).toUpperCase() + user.gender.slice(1);
    parts.push(`Gender: ${gender}`);
  }
  
  return parts.join(' • ');
}