import { OnboardingData } from './onboarding';

export interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  isTrainer: boolean;
  isApproved: boolean;
  
  // Physical attributes
  dateOfBirth?: string | null; // Server returns as string in 'YYYY-MM-DD' format
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
  weightUnit?: string;
  heightUnit?: string;
  fitnessGoal?: string | null;
  bodyType?: string | null;
  
  // AI Analysis 
  aiAnalysis?: string | null; // JSON stringified object
}

export interface UserProfile extends Omit<User, 'password'> {
  // Additional profile-specific fields can go here
}

// For updating user fields
export type UserUpdateFields = Partial<
  Pick<
    User,
    | 'height'
    | 'weight'
    | 'gender'
    | 'dateOfBirth'
    | 'weightUnit'
    | 'heightUnit'
    | 'fitnessGoal'
    | 'bodyType'
  >
>;