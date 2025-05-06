import { User } from "@/hooks/use-user";

/**
 * Checks if a user's profile has all the required fields filled in
 * @param user The user object to check
 * @returns true if the profile is complete, false otherwise
 */
export function isProfileComplete(user: User | null): boolean {
  if (!user) return false;
  
  // Check if the required fields are filled in
  return !!(
    user.dateOfBirth && 
    user.gender && 
    user.height && 
    user.weight &&
    user.fitnessGoal // New field added through onboarding
  );
}