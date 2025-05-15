export interface OnboardingData {
  gender: string | null;
  fitnessGoal?: string; // Legacy field for backward compatibility
  fitnessGoals: string[]; // New field for multiple goals selection
  bodyType: string | null;
  height: number | null;
  weight: number | null;
  heightUnit: string | null;
  weightUnit: string | null;
  dateOfBirth?: string;
  age?: number;
}

export interface AIAnalysis {
  timeframe: string;
  description: string; 
  recommendations: string[];
}

export interface OnboardingStatus {
  hasCompletedOnboarding: boolean;
  hasAcknowledgedAnalysis: boolean;
  data?: OnboardingData;
  analysis?: AIAnalysis;
}