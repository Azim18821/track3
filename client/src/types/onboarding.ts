// Define onboarding data types
export interface OnboardingData {
  // Step 1: Gender selection
  gender: 'male' | 'female' | 'other' | null;
  
  // Step 2: Goal selection (now supports multiple goals)
  fitnessGoals: Array<'weightLoss' | 'weightGain' | 'muscleBuild' | 'stamina' | 'strength'>;
  bodyType: 'ectomorph' | 'mesomorph' | 'endomorph' | null;
  
  // Legacy field for backward compatibility
  fitnessGoal: 'weightLoss' | 'weightGain' | 'muscleBuild' | 'stamina' | 'strength' | null;
  
  // Step 3: Body measurements
  height: number | null;
  weight: number | null;
  heightUnit: 'cm' | 'inches';
  weightUnit: 'kg' | 'lb';
  dateOfBirth: string | null; // Should be in format 'YYYY-MM-DD'
  
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