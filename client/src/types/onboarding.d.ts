export interface OnboardingData {
  gender: string;
  fitnessGoal?: string; // Legacy field for backward compatibility
  fitnessGoals: string[]; // New field for multiple goals selection
  bodyType: string;
  height: number;
  weight: number;
  heightUnit: string;
  weightUnit: string;
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