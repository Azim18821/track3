// Define onboarding data types
export interface OnboardingData {
  // Step 1: Goal selection
  fitnessGoal: 'weightLoss' | 'muscleBuild' | 'stamina' | 'strength' | null;
  bodyType: 'ectomorph' | 'mesomorph' | 'endomorph' | null;
  
  // Step 2: Body measurements
  height: number | null;
  weight: number | null;
  heightUnit: 'cm' | 'inches';
  weightUnit: 'kg' | 'lb';
  dateOfBirth: string | null; // Should be in format 'YYYY-MM-DD'
  gender: 'male' | 'female' | 'other' | null;
  
  // Calculated field
  age?: number;
}

// Both AIAnalysis and AiAnalysis for backward compatibility
export interface AIAnalysis {
  timeframe: string;
  description: string;
  recommendations: string[];
}

// Alias for compatibility with existing code
export type AiAnalysis = AIAnalysis;